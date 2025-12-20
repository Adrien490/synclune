import { getSession } from "@/modules/auth/lib/get-current-session";
import { cacheWishlistCount } from "@/modules/wishlist/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";

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
	"use cache";

	cacheWishlistCount(userId, sessionId);

	try {
		// Pas d'utilisateur ni de session = pas de wishlist
		if (!userId && !sessionId) {
			return 0;
		}

		const wishlist = await prisma.wishlist.findFirst({
			where: userId ? { userId } : { sessionId },
			select: {
				_count: {
					select: { items: true },
				},
			},
		});

		return wishlist?._count.items ?? 0;
	} catch (error) {
		return 0;
	}
}
