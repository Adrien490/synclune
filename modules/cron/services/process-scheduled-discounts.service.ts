import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { BATCH_DEADLINE_MS, CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

/**
 * Activates and deactivates scheduled promotions.
 *
 * Activates promotions whose startsAt has passed and endsAt is not exceeded.
 * Deactivates promotions whose endsAt has passed.
 *
 * Discounts where updatedAt > startsAt are skipped for activation to avoid
 * reactivating promotions that were manually deactivated by an admin.
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

	// 1. Find activation candidates (Prisma can't compare columns, so two-step)
	const candidates = await prisma.discount.findMany({
		where: {
			isActive: false,
			...notDeleted,
			startsAt: { lte: now },
			OR: [{ endsAt: null }, { endsAt: { gte: now } }],
		},
		select: { id: true, startsAt: true, updatedAt: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	// Filter out discounts manually deactivated by admin (updatedAt > startsAt)
	const toActivate = candidates.filter((d) => d.updatedAt <= d.startsAt);

	let activatedCount = 0;
	if (toActivate.length > 0) {
		const activated = await prisma.discount.updateMany({
			where: { id: { in: toActivate.map((d) => d.id) } },
			data: { isActive: true },
		});
		activatedCount = activated.count;
		logger.info("Activated discounts", {
			cronJob: "process-scheduled-discounts",
			activatedCount,
			skipped: candidates.length - toActivate.length,
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
