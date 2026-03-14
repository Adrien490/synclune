import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { getStoreSettingsInvalidationTags } from "@/modules/store-settings/constants/cache";
import { STORE_SETTINGS_SINGLETON_ID } from "@/modules/store-settings/constants/cache";
import { logAudit } from "@/shared/lib/audit-log";

/**
 * Automatically reopens the store when reopensAt date has passed.
 *
 * Checks if the store is closed with a reopensAt date <= now,
 * and if so, clears all closure fields and invalidates cache.
 */
export async function autoReopenStore(): Promise<{ reopened: boolean }> {
	logger.info("Starting auto-reopen store check", {
		cronJob: "auto-reopen-store",
	});

	const now = new Date();

	const settings = await prisma.storeSettings.findUnique({
		where: { id: STORE_SETTINGS_SINGLETON_ID },
		select: { isClosed: true, reopensAt: true },
	});

	if (!settings || !settings.isClosed || !settings.reopensAt) {
		logger.info("Store is not closed or has no reopensAt date, skipping", {
			cronJob: "auto-reopen-store",
			isClosed: settings?.isClosed ?? false,
			hasReopensAt: !!settings?.reopensAt,
		});
		return { reopened: false };
	}

	if (settings.reopensAt > now) {
		logger.info("reopensAt is in the future, skipping", {
			cronJob: "auto-reopen-store",
			reopensAt: settings.reopensAt.toISOString(),
		});
		return { reopened: false };
	}

	await prisma.storeSettings.update({
		where: { id: STORE_SETTINGS_SINGLETON_ID },
		data: {
			isClosed: false,
			closureMessage: null,
			reopensAt: null,
			closedAt: null,
			closedBy: null,
		},
	});

	getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

	void logAudit({
		adminId: "system",
		adminName: "Cron auto-reopen",
		action: "store.auto-reopen",
		targetType: "storeSettings",
		targetId: STORE_SETTINGS_SINGLETON_ID,
		metadata: { reopensAt: settings.reopensAt.toISOString() },
	});

	logger.info("Store automatically reopened", {
		cronJob: "auto-reopen-store",
		reopensAt: settings.reopensAt.toISOString(),
	});

	return { reopened: true };
}
