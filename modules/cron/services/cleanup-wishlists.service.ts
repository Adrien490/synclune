import { prisma } from "@/shared/lib/prisma";

/**
 * Service de nettoyage des wishlists expirées
 *
 * Supprime les wishlists guest (sans userId) dont expiresAt est dépassé.
 * Les WishlistItems sont supprimés en cascade par la base de données.
 */
export async function cleanupExpiredWishlists(): Promise<{
	deletedCount: number;
	orphanedItemsCount: number;
}> {
	const now = new Date();

	console.log("[CRON:cleanup-wishlists] Starting expired wishlists cleanup...");

	// 1. Supprimer les wishlists expirées (guests uniquement)
	const deleteResult = await prisma.wishlist.deleteMany({
		where: {
			expiresAt: { lt: now },
			userId: null, // Seulement les wishlists guest
		},
	});

	console.log(
		`[CRON:cleanup-wishlists] Deleted ${deleteResult.count} expired wishlists`
	);

	// 2. Nettoyer les WishlistItems orphelins (au cas où la cascade n'a pas fonctionné)
	const orphanedItems = await prisma.wishlistItem.deleteMany({
		where: {
			wishlistId: {
				notIn: (
					await prisma.wishlist.findMany({ select: { id: true } })
				).map((w) => w.id),
			},
		},
	});

	if (orphanedItems.count > 0) {
		console.log(
			`[CRON:cleanup-wishlists] Cleaned up ${orphanedItems.count} orphaned wishlist items`
		);
	}

	console.log("[CRON:cleanup-wishlists] Cleanup completed");

	return {
		deletedCount: deleteResult.count,
		orphanedItemsCount: orphanedItems.count,
	};
}
