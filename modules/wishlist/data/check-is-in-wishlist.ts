import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { cacheWishlist } from "@/modules/wishlist/constants/cache";

/**
 * Vérifie si un SKU est dans la wishlist de l'utilisateur connecté
 *
 * Utilise le cache privé (per-user) pour éviter les requêtes répétées.
 * Retourne false si l'utilisateur n'est pas connecté.
 *
 * @param skuId - ID du SKU à vérifier
 * @returns true si le SKU est dans la wishlist, false sinon
 */
export async function checkIsInWishlist(skuId: string): Promise<boolean> {
	"use cache: private";

	const session = await getSession();
	const userId = session?.user?.id;

	if (!userId) return false;

	cacheWishlist(userId, undefined);

	const wishlistItem = await prisma.wishlistItem.findFirst({
		where: {
			skuId,
			wishlist: { userId },
		},
		select: { id: true },
	});

	return !!wishlistItem;
}
