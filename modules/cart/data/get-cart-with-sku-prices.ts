import { cacheLife } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { cacheCart } from "@/modules/cart/utils/cache";

// ============================================================================
// TYPES
// ============================================================================

export type CartWithSkuPrices = Awaited<ReturnType<typeof fetchCartWithSkuPrices>>;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère le panier avec les prix actuels des SKUs pour comparaison
 *
 * Utilisé par update-cart-prices pour identifier les items dont le prix a changé.
 *
 * @param userId - ID de l'utilisateur connecté (optionnel)
 * @param sessionId - ID de session visiteur (optionnel)
 */
export async function getCartWithSkuPrices(
	userId?: string,
	sessionId?: string
): Promise<CartWithSkuPrices> {
	return fetchCartWithSkuPrices(userId, sessionId);
}

// ============================================================================
// FETCH FUNCTION (CACHED)
// ============================================================================

async function fetchCartWithSkuPrices(userId?: string, sessionId?: string) {
	"use cache: private";
	cacheLife("cart");
	cacheCart(userId, sessionId);

	if (!userId && !sessionId) {
		return null;
	}

	return prisma.cart.findFirst({
		where: {
			...(userId ? { userId } : { sessionId: sessionId! }),
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
							priceInclTax: true,
							isActive: true,
							deletedAt: true,
							product: {
								select: {
									status: true,
									deletedAt: true,
								},
							},
						},
					},
				},
			},
		},
	});
}
