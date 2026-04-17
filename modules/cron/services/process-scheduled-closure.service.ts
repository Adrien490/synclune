import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import {
	STORE_SETTINGS_SINGLETON_ID,
	getStoreSettingsInvalidationTags,
} from "@/modules/store-settings/constants/cache";
import { logAudit } from "@/shared/lib/audit-log";

/**
 * Applies a scheduled closure when scheduledCloseAt has passed.
 *
 * Checks if the store is open with a scheduledCloseAt date <= now,
 * and if so, flips isClosed to true, sets closedAt/closedBy, clears
 * scheduledCloseAt, and invalidates cache.
 */
export async function processScheduledClosure(): Promise<{ closed: boolean }> {
	logger.info("Starting scheduled closure check", {
		cronJob: "process-scheduled-closure",
	});

	const now = new Date();

	const settings = await prisma.storeSettings.findUnique({
		where: { id: STORE_SETTINGS_SINGLETON_ID },
		select: {
			isClosed: true,
			scheduledCloseAt: true,
			closureMessage: true,
			reopensAt: true,
		},
	});

	if (!settings || settings.isClosed || !settings.scheduledCloseAt) {
		logger.info("No pending scheduled closure, skipping", {
			cronJob: "process-scheduled-closure",
			isClosed: settings?.isClosed ?? false,
			hasScheduledCloseAt: !!settings?.scheduledCloseAt,
		});
		return { closed: false };
	}

	if (settings.scheduledCloseAt > now) {
		logger.info("scheduledCloseAt is in the future, skipping", {
			cronJob: "process-scheduled-closure",
			scheduledCloseAt: settings.scheduledCloseAt.toISOString(),
		});
		return { closed: false };
	}

	await prisma.storeSettings.update({
		where: { id: STORE_SETTINGS_SINGLETON_ID },
		data: {
			isClosed: true,
			closedAt: now,
			closedBy: "Cron auto-close",
			scheduledCloseAt: null,
		},
	});

	getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

	void logAudit({
		adminId: "system",
		adminName: "Cron auto-close",
		action: "store.auto-close",
		targetType: "storeSettings",
		targetId: STORE_SETTINGS_SINGLETON_ID,
		metadata: {
			scheduledCloseAt: settings.scheduledCloseAt.toISOString(),
			closureMessage: settings.closureMessage,
			reopensAt: settings.reopensAt?.toISOString() ?? null,
		},
	});

	logger.info("Store automatically closed via scheduled closure", {
		cronJob: "process-scheduled-closure",
		scheduledCloseAt: settings.scheduledCloseAt.toISOString(),
	});

	return { closed: true };
}
