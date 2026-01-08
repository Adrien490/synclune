import { prisma } from "@/shared/lib/prisma";

/**
 * Service de nettoyage des paniers expirés
 *
 * Supprime les paniers guest (sans userId) dont expiresAt est dépassé.
 * Les CartItems sont supprimés en cascade par la base de données.
 */
export async function cleanupExpiredCarts(): Promise<{
	deletedCount: number;
	orphanedItemsCount: number;
}> {
	const now = new Date();

	console.log("[CRON:cleanup-carts] Starting expired carts cleanup...");

	// 1. Supprimer les paniers expirés (guests uniquement)
	const deleteResult = await prisma.cart.deleteMany({
		where: {
			expiresAt: { lt: now },
			userId: null, // Seulement les paniers guest
		},
	});

	console.log(`[CRON:cleanup-carts] Deleted ${deleteResult.count} expired carts`);

	// 2. Nettoyer les CartItems orphelins (au cas où la cascade n'a pas fonctionné)
	const orphanedItems = await prisma.cartItem.deleteMany({
		where: {
			cartId: {
				notIn: (await prisma.cart.findMany({ select: { id: true } })).map(
					(c) => c.id
				),
			},
		},
	});

	if (orphanedItems.count > 0) {
		console.log(
			`[CRON:cleanup-carts] Cleaned up ${orphanedItems.count} orphaned cart items`
		);
	}

	console.log("[CRON:cleanup-carts] Cleanup completed");

	return {
		deletedCount: deleteResult.count,
		orphanedItemsCount: orphanedItems.count,
	};
}
