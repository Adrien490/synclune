import { prisma } from "@/shared/lib/prisma";
import { cacheCart } from "@/modules/cart/utils/cache";

// ============================================================================
// TYPES
// ============================================================================

export type GuestCartForMerge = Awaited<ReturnType<typeof fetchGuestCartForMerge>>;
export type UserCartForMerge = Awaited<ReturnType<typeof fetchUserCartForMerge>>;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le panier visiteur pour la fusion avec include complet SKU/product
 *
 * @param sessionId - ID de session visiteur
 */
export async function getGuestCartForMerge(
	sessionId: string
): Promise<GuestCartForMerge> {
	return fetchGuestCartForMerge(sessionId);
}

/**
 * Récupère le panier utilisateur pour la fusion (items simples)
 *
 * @param userId - ID de l'utilisateur connecté
 */
export async function getUserCartForMerge(
	userId: string
): Promise<UserCartForMerge> {
	return fetchUserCartForMerge(userId);
}

// ============================================================================
// FETCH FUNCTIONS (CACHED)
// ============================================================================

async function fetchGuestCartForMerge(sessionId: string) {
	"use cache: private";

	cacheCart(undefined, sessionId);

	return prisma.cart.findFirst({
		where: {
			sessionId,
			OR: [
				{ expiresAt: null },
				{ expiresAt: { gt: new Date() } },
			],
		},
		include: {
			items: {
				include: {
					sku: {
						select: {
							id: true,
							inventory: true,
							isActive: true,
							product: {
								select: {
									id: true,
									status: true,
								},
							},
						},
					},
				},
			},
		},
	});
}

async function fetchUserCartForMerge(userId: string) {
	"use cache: private";

	cacheCart(userId, undefined);

	return prisma.cart.findUnique({
		where: { userId },
		include: {
			items: true,
		},
	});
}
