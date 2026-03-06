import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { BATCH_DEADLINE_MS, CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

/**
 * Activates and deactivates scheduled promotions.
 *
 * Activates promotions whose startsAt has passed, endsAt is not exceeded,
 * and manuallyDeactivated is false (set by admin toggle).
 * Deactivates promotions whose endsAt has passed.
 */
export async function processScheduledDiscounts(): Promise<{
	activated: number;
	deactivated: number;
	hasMore: boolean;
}> {
	logger.info("Starting scheduled discounts processing", {
		cronJob: "process-scheduled-discounts",
	});

	const now = new Date();
	const deadline = Date.now() + BATCH_DEADLINE_MS;

	// 1. Find activation candidates — exclude discounts manually deactivated by an admin
	const candidates = await prisma.discount.findMany({
		where: {
			isActive: false,
			manuallyDeactivated: false,
			...notDeleted,
			startsAt: { lte: now },
			OR: [{ endsAt: null }, { endsAt: { gte: now } }],
		},
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const toActivate = candidates;

	let activatedCount = 0;
	if (toActivate.length > 0) {
		const activated = await prisma.discount.updateMany({
			where: { id: { in: toActivate.map((d) => d.id) } },
			data: { isActive: true, manuallyDeactivated: false },
		});
		activatedCount = activated.count;
		logger.info("Activated discounts", {
			cronJob: "process-scheduled-discounts",
			activatedCount,
		});
	}

	// Check deadline before deactivation phase
	if (Date.now() > deadline) {
		logger.warn("Approaching timeout, skipping deactivation phase", {
			cronJob: "process-scheduled-discounts",
		});
		if (activatedCount > 0) {
			updateTag(DISCOUNT_CACHE_TAGS.LIST);
		}
		return { activated: activatedCount, deactivated: 0, hasMore: true };
	}

	// 2. Deactivate expired promotions (bounded)
	const expiredIds = await prisma.discount.findMany({
		where: {
			isActive: true,
			...notDeleted,
			endsAt: { lt: now },
		},
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	let deactivatedCount = 0;
	if (expiredIds.length > 0) {
		const deactivated = await prisma.discount.updateMany({
			where: { id: { in: expiredIds.map((d) => d.id) } },
			data: { isActive: false },
		});
		deactivatedCount = deactivated.count;
		logger.info("Deactivated discounts", {
			cronJob: "process-scheduled-discounts",
			deactivatedCount,
		});
	}

	// Invalidate discount cache if any changes were made
	if (activatedCount > 0 || deactivatedCount > 0) {
		updateTag(DISCOUNT_CACHE_TAGS.LIST);
	}

	logger.info("Scheduled discounts processing completed", {
		cronJob: "process-scheduled-discounts",
		activated: activatedCount,
		deactivated: deactivatedCount,
	});

	return {
		activated: activatedCount,
		deactivated: deactivatedCount,
		hasMore:
			candidates.length === CLEANUP_DELETE_LIMIT || expiredIds.length === CLEANUP_DELETE_LIMIT,
	};
}
