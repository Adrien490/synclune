import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

/**
 * Cleans up expired guest wishlists.
 *
 * Deletes guest wishlists (no userId) past their expiresAt date.
 * WishlistItems are deleted in cascade by the database.
 */
export async function cleanupExpiredWishlists(): Promise<{
	deletedCount: number;
	orphanedItemsCount: number;
	hasMore: boolean;
}> {
	const now = new Date();
	let deletedCount = 0;
	let orphanedItemsCount = 0;
	let hasMore = false;

	logger.info("Starting expired wishlists cleanup", { cronJob: "cleanup-wishlists" });

	try {
		// 1. Find expired guest wishlists (bounded to avoid long-running deletes)
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

		logger.info("Deleted expired wishlists", { cronJob: "cleanup-wishlists", deletedCount });

		if (hasMore) {
			logger.warn("Delete limit reached, remaining wishlists will be cleaned on next run", {
				cronJob: "cleanup-wishlists",
			});
		}

		// 2. Clean up orphaned WishlistItems (safety net if cascade didn't trigger)
		// Uses raw SQL to avoid loading all IDs into memory
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
				cronJob: "cleanup-wishlists",
				orphanedItemsCount,
			});
		}
	} catch (error) {
		logger.error("Error during cleanup", error, { cronJob: "cleanup-wishlists" });
		throw error;
	}

	logger.info("Cleanup completed", { cronJob: "cleanup-wishlists" });

	return {
		deletedCount,
		orphanedItemsCount,
		hasMore,
	};
}
