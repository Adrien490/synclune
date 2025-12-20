import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";

/**
 * Vérifie si un SKU est dans la wishlist de l'utilisateur connecté ou du visiteur
 *
 * Utilise le cache privé (per-user/session) pour éviter les requêtes répétées.
 * Retourne false si pas d'utilisateur ni de session.
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * @param skuId - ID du SKU à vérifier
 * @returns true si le SKU est dans la wishlist, false sinon
 */
export async function checkIsInWishlist(skuId: string): Promise<boolean> {
	const session = await getSession();
	const userId = session?.user?.id;
	const sessionId = !userId ? await getWishlistSessionId() : null;

	return fetchIsInWishlist(skuId, userId, sessionId || undefined);
}

/**
 * Fonction cachée qui vérifie si un SKU est dans la wishlist
 */
async function fetchIsInWishlist(
	skuId: string,
	userId?: string,
	sessionId?: string
): Promise<boolean> {
	"use cache";
	cacheLife("cart");

	cacheTag(
		userId
			? `wishlist-check-user-${userId}`
			: sessionId
				? `wishlist-check-session-${sessionId}`
				: "wishlist-check-anonymous"
	);

	// Pas d'utilisateur ni de session = pas dans la wishlist
	if (!userId && !sessionId) return false;

	const wishlistItem = await prisma.wishlistItem.findFirst({
		where: {
			skuId,
			wishlist: userId ? { userId } : { sessionId },
		},
		select: { id: true },
	});

	return !!wishlistItem;
}
