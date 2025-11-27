import { getSession } from "@/shared/utils/get-session";
import { cacheWishlistCount } from "@/modules/wishlist/constants/cache";
import { prisma } from "@/shared/lib/prisma";

import type { GetWishlistItemCountReturn } from "../types/wishlist.types";

// Re-export pour compatibilité
export type { GetWishlistItemCountReturn } from "../types/wishlist.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre d'items dans la wishlist de l'utilisateur connecté
 *
 * Utilisé pour afficher le badge dans le header
 *
 * Authentification requise: L'utilisateur doit être connecté.
 *
 * @returns Nombre d'items dans la wishlist
 */
export async function getWishlistItemCount(): Promise<GetWishlistItemCountReturn> {
	const session = await getSession();
	const userId = session?.user?.id;

	return await fetchWishlistItemCount(userId);
}

/**
 * Récupère le nombre d'items dans la wishlist d'un utilisateur connecté
 *
 * @param userId - ID de l'utilisateur connecté
 * @returns Nombre d'items dans la wishlist
 */
export async function fetchWishlistItemCount(
	userId?: string
): Promise<GetWishlistItemCountReturn> {
	"use cache: private";

	cacheWishlistCount(userId, undefined);

	try {
		if (!userId) {
			return 0;
		}

		const wishlist = await prisma.wishlist.findUnique({
			where: { userId },
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
