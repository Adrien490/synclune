import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";
import { WISHLIST_CACHE_TAGS } from "../constants/cache";

import type { GetWishlistItemCountReturn } from "../types/wishlist.types";

// Re-export pour compatibilité
export type { GetWishlistItemCountReturn } from "../types/wishlist.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre d'items dans la wishlist de l'utilisateur connecté ou du visiteur
 *
 * Utilisé pour afficher le badge dans le header
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * @returns Nombre d'items dans la wishlist
 */
export async function getWishlistItemCount(): Promise<GetWishlistItemCountReturn> {
	const session = await getSession();
	const userId = session?.user?.id;
	const sessionId = !userId ? await getWishlistSessionId() : null;

	return await fetchWishlistItemCount(userId, sessionId || undefined);
}

/**
 * Récupère le nombre d'items dans la wishlist d'un utilisateur ou visiteur
 *
 * @param userId - ID de l'utilisateur connecté (optionnel)
 * @param sessionId - ID de session visiteur (optionnel)
 * @returns Nombre d'items dans la wishlist
 */
export async function fetchWishlistItemCount(
	userId?: string,
	sessionId?: string
): Promise<GetWishlistItemCountReturn> {
	"use cache: private";
	cacheLife("cart");
	cacheTag(WISHLIST_CACHE_TAGS.COUNT(userId, sessionId));

	try {
		// Pas d'utilisateur ni de session = pas de wishlist
		if (!userId && !sessionId) {
			return 0;
		}

		const count = await prisma.wishlistItem.count({
			where: {
				wishlist: userId ? { userId } : { sessionId },
				product: {
					status: "PUBLIC",
					deletedAt: null,
				},
			},
		});

		return count;
	} catch (e) {
		console.error("[GET_WISHLIST_ITEM_COUNT]", e);
		return 0;
	}
}
