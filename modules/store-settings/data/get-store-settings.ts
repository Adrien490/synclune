import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { STORE_SETTINGS_SINGLETON_ID, cacheStoreSettings } from "../constants/cache";
import type { StoreSettingsAdmin } from "../types/store-settings.types";

/** Get full store settings for admin page */
export async function getStoreSettings(): Promise<StoreSettingsAdmin | null> {
	return fetchStoreSettings();
}

async function fetchStoreSettings(): Promise<StoreSettingsAdmin | null> {
	"use cache";
	cacheStoreSettings();

	try {
		return await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: {
				id: true,
				isClosed: true,
				closureMessage: true,
				reopensAt: true,
				closedAt: true,
				closedBy: true,
				updatedAt: true,
			},
		});
	} catch (err) {
		logger.error("Failed to fetch store settings", err, {
			service: "getStoreSettings",
		});
		return null;
	}
}
