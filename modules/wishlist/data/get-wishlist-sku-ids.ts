import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { cacheWishlist } from "@/modules/wishlist/constants/cache";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";

/**
 * Récupère tous les SKU IDs présents dans la wishlist de l'utilisateur/visiteur
 *
 * Optimisé pour éviter le problème N+1 : une seule requête pour tous les SKUs.
 * Retourne un Set pour des lookups O(1) dans les listes de produits.
 *
 * @returns Set des SKU IDs dans la wishlist (vide si pas de wishlist)
 *
 * @example
 * ```tsx
 * const wishlistSkuIds = await getWishlistSkuIds();
 * const isInWishlist = wishlistSkuIds.has(sku.id);
 * ```
 */
export async function getWishlistSkuIds(): Promise<Set<string>> {
	"use cache: private";

	const session = await getSession();
	const userId = session?.user?.id;
	const sessionId = !userId ? await getWishlistSessionId() : null;

	// Pas d'utilisateur ni de session = wishlist vide
	if (!userId && !sessionId) return new Set();

	cacheWishlist(userId, sessionId || undefined);

	const wishlistItems = await prisma.wishlistItem.findMany({
		where: {
			wishlist: userId ? { userId } : { sessionId },
			sku: {
				isActive: true,
				product: {
					status: "PUBLIC",
				},
			},
		},
		select: { skuId: true },
	});

	return new Set(wishlistItems.map((item) => item.skuId));
}
