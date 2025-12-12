import { z } from "zod";

// ============================================================================
// CART ITEM SCHEMAS
// ============================================================================

export const addToCartSchema = z.object({
	skuId: z.cuid("ID SKU invalide"),
	quantity: z.literal(1).default(1),
});

// ============================================================================
// CART ACTION SCHEMAS
// ============================================================================

/**
 * Schéma de validation pour la mise à jour d'un item
 */
export const updateCartItemSchema = z.object({
	cartItemId: z.cuid("ID de l'article invalide"),
	quantity: z
		.number()
		.int()
		.min(1, "Quantité minimale: 1")
		.max(99, "Quantité maximale: 99"),
});

/**
 * Schéma de validation pour la suppression d'un item
 */
export const removeFromCartSchema = z.object({
	cartItemId: z.cuid("ID de l'article invalide"),
});
