import { prisma } from "@/shared/lib/prisma";
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

	console.log("[CRON:cleanup-wishlists] Starting expired wishlists cleanup...");

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

		console.log(
			`[CRON:cleanup-wishlists] Deleted ${deletedCount} expired wishlists`
		);

		if (hasMore) {
			console.warn(
				"[CRON:cleanup-wishlists] Delete limit reached, remaining wishlists will be cleaned on next run"
			);
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
			console.log(
				`[CRON:cleanup-wishlists] Cleaned up ${orphanedItemsCount} orphaned wishlist items`
			);
		}
	} catch (error) {
		console.error(
			"[CRON:cleanup-wishlists] Error during cleanup:",
			error instanceof Error ? error.message : String(error)
		);
		throw error;
	}

	console.log("[CRON:cleanup-wishlists] Cleanup completed");

	return {
		deletedCount,
		orphanedItemsCount,
		hasMore,
	};
}
