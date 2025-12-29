import { prisma } from "@/shared/lib/prisma";
import { cacheWishlist } from "@/modules/wishlist/utils/cache.utils";

// ============================================================================
// TYPES
// ============================================================================

export type GuestWishlistForMerge = Awaited<ReturnType<typeof fetchGuestWishlistForMerge>>;
export type UserWishlistForMerge = Awaited<ReturnType<typeof fetchUserWishlistForMerge>>;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la wishlist visiteur pour la fusion avec include product status
 *
 * @param sessionId - ID de session visiteur
 */
export async function getGuestWishlistForMerge(
	sessionId: string
): Promise<GuestWishlistForMerge> {
	return fetchGuestWishlistForMerge(sessionId);
}

/**
 * Récupère la wishlist utilisateur pour la fusion (items simples)
 *
 * @param userId - ID de l'utilisateur connecté
 */
export async function getUserWishlistForMerge(
	userId: string
): Promise<UserWishlistForMerge> {
	return fetchUserWishlistForMerge(userId);
}

// ============================================================================
// FETCH FUNCTIONS (CACHED)
// ============================================================================

async function fetchGuestWishlistForMerge(sessionId: string) {
	"use cache: private";

	cacheWishlist(undefined, sessionId);

	return prisma.wishlist.findUnique({
		where: { sessionId },
		include: {
			items: {
				include: {
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

async function fetchUserWishlistForMerge(userId: string) {
	"use cache: private";

	cacheWishlist(userId, undefined);

	return prisma.wishlist.findUnique({
		where: { userId },
		include: {
			items: {
				select: {
					productId: true,
				},
			},
		},
	});
}
