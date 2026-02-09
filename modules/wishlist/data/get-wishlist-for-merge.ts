import { prisma } from "@/shared/lib/prisma";

// ============================================================================
// TYPES
// ============================================================================

export type GuestWishlistForMerge = Awaited<ReturnType<typeof getGuestWishlistForMerge>>;
export type UserWishlistForMerge = Awaited<ReturnType<typeof getUserWishlistForMerge>>;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Recupere la wishlist visiteur pour la fusion avec product status
 * No cache: data is immediately mutated/deleted by merge-wishlists
 *
 * @param sessionId - ID de session visiteur
 */
export async function getGuestWishlistForMerge(sessionId: string) {
	return prisma.wishlist.findUnique({
		where: { sessionId },
		select: {
			id: true,
			items: {
				select: {
					productId: true,
					product: {
						select: {
							id: true,
							status: true,
						},
					},
				},
			},
		},
	});
}

/**
 * Recupere la wishlist utilisateur pour la fusion (items simples)
 * No cache: data is immediately mutated by merge-wishlists
 *
 * @param userId - ID de l'utilisateur connecte
 */
export async function getUserWishlistForMerge(userId: string) {
	return prisma.wishlist.findUnique({
		where: { userId },
		select: {
			id: true,
			items: {
				select: {
					productId: true,
				},
			},
		},
	});
}
