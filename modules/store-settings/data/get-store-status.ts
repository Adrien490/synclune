import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { STORE_SETTINGS_SINGLETON_ID, cacheStoreStatus } from "../constants/cache";
import type { StoreStatus } from "../types/store-settings.types";

/** Get store open/closed status for storefront gate. Fail-open: never block by accident. */
export async function getStoreStatus(): Promise<StoreStatus> {
	return fetchStoreStatus();
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
