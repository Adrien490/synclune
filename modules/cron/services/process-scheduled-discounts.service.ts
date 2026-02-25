import { prisma, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

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
	console.log(
		"[CRON:process-scheduled-discounts] Starting scheduled discounts processing..."
	);

	const now = new Date();

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
	const toActivate = candidates.filter(
		(d) => d.updatedAt <= d.startsAt
	);

	let activatedCount = 0;
	if (toActivate.length > 0) {
		const activated = await prisma.discount.updateMany({
			where: { id: { in: toActivate.map((d) => d.id) } },
			data: { isActive: true },
		});
		activatedCount = activated.count;
		console.log(
			`[CRON:process-scheduled-discounts] Activated ${activatedCount} discounts (${candidates.length - toActivate.length} skipped: manually deactivated)`
		);
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
		console.log(
			`[CRON:process-scheduled-discounts] Deactivated ${deactivatedCount} discounts`
		);
	}

	// Invalidate discount cache if any changes were made
	if (activatedCount > 0 || deactivatedCount > 0) {
		updateTag(DISCOUNT_CACHE_TAGS.LIST);
	}

	console.log(
		`[CRON:process-scheduled-discounts] Completed: ${activatedCount} activated, ${deactivatedCount} deactivated`
	);

	return {
		activated: activatedCount,
		deactivated: deactivatedCount,
		hasMore: candidates.length === CLEANUP_DELETE_LIMIT || expiredIds.length === CLEANUP_DELETE_LIMIT,
	};
}
