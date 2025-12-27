import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { CART_CACHE_TAGS } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type GetProductCartsCountReturn = number;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère le nombre de paniers actifs contenant un produit
 *
 * Utilisé pour afficher "Actuellement dans X paniers" (pattern Etsy).
 * Compte les paniers:
 * - D'utilisateurs connectés (toujours actifs)
 * - De visiteurs avec session non expirée
 *
 * @param productId - ID du produit
 * @returns Le nombre de paniers contenant ce produit
 */
export async function getProductCartsCount(
	productId: string
): Promise<GetProductCartsCountReturn> {
	"use cache";
	cacheLife("products");
	cacheTag(CART_CACHE_TAGS.PRODUCT_CARTS(productId));

	const count = await prisma.cart.count({
		where: {
			items: {
				some: {
					sku: {
						productId: productId,
						isActive: true,
						deletedAt: null,
					},
				},
			},
			OR: [
				// Paniers d'utilisateurs connectés (toujours actifs)
				{ userId: { not: null } },
				// Paniers de visiteurs non expirés
				{
					sessionId: { not: null },
					expiresAt: { gt: new Date() },
				},
			],
		},
	});

	return count;
}
