import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { STORE_SETTINGS_SINGLETON_ID, cacheStoreStatus } from "../constants/cache";
import type { StoreStatus } from "../types/store-settings.types";

/** Get store open/closed status for storefront gate. Fail-open: never block by accident. */
export async function getStoreStatus(): Promise<StoreStatus> {
	const cached = await fetchStoreStatus();

	// Read-time reopening OUTSIDE cache: if reopensAt has passed, treat the store
	// as open. Since Lot 1 (SIMPLIFICATION.md, 2026-08-03) this is the ONLY
	// mechanism — the `reopen-store` cron that used to flip the DB row was removed
	// as redundant ; the stale row is harmless and cleared at the next manual
	// close/reopen. Date.now() can NOT live inside the "use cache" body — it would
	// be frozen at cache-write time and never re-evaluate.
	if (cached.isClosed && cached.reopensAt && cached.reopensAt.getTime() <= Date.now()) {
		return { isClosed: false, closureMessage: null, reopensAt: null };
	}

	return cached;
}

async function fetchStoreStatus(): Promise<StoreStatus> {
	"use cache";
	cacheStoreStatus();

	try {
		const settings = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: {
				isClosed: true,
				closureMessage: true,
				reopensAt: true,
			},
		});

		if (!settings) {
			return { isClosed: false, closureMessage: null, reopensAt: null };
		}

		return settings;
	} catch (err) {
		logger.error("Failed to fetch store status", err, {
			service: "getStoreStatus",
		});
		// Fail open: if DB is down, don't block the storefront
		return { isClosed: false, closureMessage: null, reopensAt: null };
	}
}
