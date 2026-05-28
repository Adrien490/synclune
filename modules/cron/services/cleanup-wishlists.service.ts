import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "cleanup-wishlists";

function captureStepError(error: unknown, step: string): void {
	Sentry.withScope((scope) => {
		scope.setTag("cronJob", CRON_JOB);
		scope.setTag("step", step);
		scope.setLevel("error");
		scope.setFingerprint(["cron", CRON_JOB, step]);
		Sentry.captureException(error);
	});
}

/**
 * Cleans up expired guest wishlists.
 *
 * Deletes guest wishlists (no userId) past their expiresAt date.
 * WishlistItems are deleted in cascade by the database.
 *
 * OPS-AUDIT-005 : per-step try/catch preserves partial counts so an orphan
 * cleanup failure does not erase the prior wishlist deletion metric.
 */
export async function cleanupExpiredWishlists(): Promise<CronResult> {
	const now = new Date();
	let deletedCount = 0;
	let orphanedItemsCount = 0;
	let errored = 0;
	let hasMore = false;

	logger.info("Starting expired wishlists cleanup", { cronJob: CRON_JOB });

	// 1. Find expired guest wishlists (bounded to avoid long-running deletes)
	try {
		const wishlistsToDelete = await prisma.wishlist.findMany({
			where: {
				expiresAt: { lt: now },
				userId: null,
			},
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		const deleteResult = await prisma.wishlist.deleteMany({
			where: { id: { in: wishlistsToDelete.map((w) => w.id) } },
		});

		deletedCount = deleteResult.count;
		hasMore = wishlistsToDelete.length === CLEANUP_DELETE_LIMIT;

		logger.info("Deleted expired wishlists", { cronJob: CRON_JOB, deletedCount });

		if (hasMore) {
			logger.warn("Delete limit reached, remaining wishlists will be cleaned on next run", {
				cronJob: CRON_JOB,
			});
		}
	} catch (error) {
		logger.error("Error deleting expired wishlists", error, { cronJob: CRON_JOB });
		captureStepError(error, "wishlist-deletion");
		errored++;
	}

	// 2. Clean up orphaned WishlistItems (safety net if cascade didn't trigger)
	// Uses raw SQL to avoid loading all IDs into memory
	try {
		const rawCount = await prisma.$executeRaw`
			DELETE FROM "WishlistItem"
			WHERE id IN (
				SELECT wi.id FROM "WishlistItem" wi
				WHERE NOT EXISTS (
					SELECT 1 FROM "Wishlist" w WHERE w.id = wi."wishlistId"
				)
				LIMIT ${CLEANUP_DELETE_LIMIT}
			)
		`;

		orphanedItemsCount = Number(rawCount);

		if (orphanedItemsCount > 0) {
			logger.info("Cleaned up orphaned wishlist items", {
				cronJob: CRON_JOB,
				orphanedItemsCount,
			});
		}
	} catch (error) {
		logger.error("Error cleaning orphaned wishlist items", error, { cronJob: CRON_JOB });
		captureStepError(error, "orphan-items");
		errored++;
	}

	logger.info("Cleanup completed", { cronJob: CRON_JOB, errored });

	return {
		processed: deletedCount + orphanedItemsCount,
		errored,
		skipped: 0,
		deletedCount,
		orphanedItemsCount,
		hasMore,
	};
}
