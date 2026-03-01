import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

/**
 * Cleans up expired guest carts.
 *
 * Deletes guest carts (no userId) past their expiresAt date.
 * CartItems are deleted in cascade by the database.
 */
export async function cleanupExpiredCarts(): Promise<{
	deletedCount: number;
	orphanedItemsCount: number;
	hasMore: boolean;
}> {
	const now = new Date();
	let deletedCount = 0;
	let orphanedItemsCount = 0;
	let hasMore = false;

	logger.info("Starting expired carts cleanup", { cronJob: "cleanup-carts" });

	try {
		// 1. Find expired guest carts (bounded to avoid long-running deletes)
		const cartsToDelete = await prisma.cart.findMany({
			where: {
				expiresAt: { lt: now },
				userId: null,
			},
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		const deleteResult = await prisma.cart.deleteMany({
			where: { id: { in: cartsToDelete.map((c) => c.id) } },
		});

		deletedCount = deleteResult.count;
		hasMore = cartsToDelete.length === CLEANUP_DELETE_LIMIT;

		logger.info("Deleted expired carts", { cronJob: "cleanup-carts", deletedCount });

		if (hasMore) {
			logger.warn("Delete limit reached, remaining carts will be cleaned on next run", {
				cronJob: "cleanup-carts",
			});
		}

		// 2. Clean up orphaned CartItems (safety net if cascade didn't trigger)
		// Uses raw SQL to avoid loading all IDs into memory
		const rawCount = await prisma.$executeRaw`
			DELETE FROM "CartItem"
			WHERE id IN (
				SELECT ci.id FROM "CartItem" ci
				WHERE NOT EXISTS (
					SELECT 1 FROM "Cart" c WHERE c.id = ci."cartId"
				)
				LIMIT ${CLEANUP_DELETE_LIMIT}
			)
		`;

		orphanedItemsCount = Number(rawCount);

		if (orphanedItemsCount > 0) {
			logger.info("Cleaned up orphaned cart items", {
				cronJob: "cleanup-carts",
				orphanedItemsCount,
			});
		}
	} catch (error) {
		logger.error("Error during cleanup", error, { cronJob: "cleanup-carts" });
		throw error;
	}

	logger.info("Cleanup completed", { cronJob: "cleanup-carts" });

	return {
		deletedCount,
		orphanedItemsCount,
		hasMore,
	};
}
