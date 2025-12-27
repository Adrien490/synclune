import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";
import { WISHLIST_CACHE_TAGS } from "@/modules/wishlist/constants/cache";

/**
 * Récupère tous les Product IDs présents dans la wishlist de l'utilisateur/visiteur
 *
 * Optimisé pour éviter le problème N+1 : une seule requête pour tous les produits.
 * Retourne un Set pour des lookups O(1) dans les listes de produits.
 *
 * @returns Set des Product IDs dans la wishlist (vide si pas de wishlist)
 *
 * @example
 * ```tsx
 * const wishlistProductIds = await getWishlistProductIds();
 * const isInWishlist = wishlistProductIds.has(product.id);
 * ```
 */
export async function getWishlistProductIds(): Promise<Set<string>> {
	const session = await getSession();
	const userId = session?.user?.id;
	const sessionId = !userId ? await getWishlistSessionId() : null;

	return fetchWishlistProductIds(userId, sessionId || undefined);
}

/**
 * Fonction cachée qui récupère les Product IDs de la wishlist
 */
async function fetchWishlistProductIds(
	userId?: string,
	sessionId?: string
): Promise<Set<string>> {
	"use cache: private";
	cacheLife("cart");

	cacheTag(WISHLIST_CACHE_TAGS.PRODUCT_IDS(userId, sessionId));

	// Pas d'utilisateur ni de session = wishlist vide
	if (!userId && !sessionId) return new Set();

	const wishlistItems = await prisma.wishlistItem.findMany({
		where: {
			wishlist: userId ? { userId } : { sessionId },
			product: {
				status: "PUBLIC",
			},
		},
		select: { productId: true },
	});

	return new Set(wishlistItems.map((item) => item.productId));
}
