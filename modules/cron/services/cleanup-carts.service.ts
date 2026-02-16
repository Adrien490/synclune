import { prisma } from "@/shared/lib/prisma";
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
}> {
	const now = new Date();

	console.log("[CRON:cleanup-carts] Starting expired carts cleanup...");

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

	console.log(`[CRON:cleanup-carts] Deleted ${deleteResult.count} expired carts`);

	if (cartsToDelete.length === CLEANUP_DELETE_LIMIT) {
		console.warn(
			"[CRON:cleanup-carts] Delete limit reached, remaining carts will be cleaned on next run"
		);
	}

	// 2. Clean up orphaned CartItems (safety net if cascade didn't trigger)
	// Uses raw SQL to avoid loading all IDs into memory
	const orphanedItemsCount = await prisma.$executeRaw`
		DELETE FROM "CartItem"
		WHERE id IN (
			SELECT ci.id FROM "CartItem" ci
			WHERE NOT EXISTS (
				SELECT 1 FROM "Cart" c WHERE c.id = ci."cartId"
			)
			LIMIT ${CLEANUP_DELETE_LIMIT}
		)
	`;

	if (orphanedItemsCount > 0) {
		console.log(
			`[CRON:cleanup-carts] Cleaned up ${orphanedItemsCount} orphaned cart items`
		);
	}

	console.log("[CRON:cleanup-carts] Cleanup completed");

	return {
		deletedCount: deleteResult.count,
		orphanedItemsCount: Number(orphanedItemsCount),
	};
}
