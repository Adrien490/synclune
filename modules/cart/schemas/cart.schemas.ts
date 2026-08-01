import { z } from "zod";
import { MAX_QUANTITY_PER_ORDER } from "../constants/cart";

// ============================================================================
// CART ITEM SCHEMAS
// ============================================================================

export const addToCartSchema = z.object({
	skuId: z.cuid2("ID SKU invalide"),
	quantity: z
		.number()
		.int()
		.min(1, "Quantité minimale: 1")
		.max(MAX_QUANTITY_PER_ORDER, `Quantité maximale: ${MAX_QUANTITY_PER_ORDER}`)
		.default(1),
});

// ============================================================================
// CART ACTION SCHEMAS
// ============================================================================

/**
 * Schéma de validation pour la mise à jour d'un item
 */
export const updateCartItemSchema = z.object({
	cartItemId: z.cuid2("ID de l'article invalide"),
	quantity: z
		.number()
		.int()
		.min(1, "Quantité minimale: 1")
		.max(MAX_QUANTITY_PER_ORDER, `Quantité maximale: ${MAX_QUANTITY_PER_ORDER}`),
});

/**
 * Schéma de validation pour la suppression d'un item
 */
export const removeFromCartSchema = z.object({
	cartItemId: z.cuid2("ID de l'article invalide"),
});

// ============================================================================
// SKU VALIDATION SCHEMAS
// ============================================================================

import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Schema pour récupérer les détails d'un SKU
 */
export const getSkuDetailsSchema = z.object({
	skuId: z.cuid2(CART_ERROR_MESSAGES.SKU_NOT_FOUND),
});

// ============================================================================
// CART METADATA SCHEMAS (P1 + P2 + P3)
// ============================================================================

/**
 * Schema pour appliquer un code promo au panier
 */
export const applyCartDiscountSchema = z.object({
	code: z
		.string()
		.trim()
		.min(1, CART_ERROR_MESSAGES.DISCOUNT_CODE_REQUIRED)
		.max(30, CART_ERROR_MESSAGES.DISCOUNT_CODE_INVALID)
		.transform((v) => v.toUpperCase()),
});

/**
 * Schema pour supprimer plusieurs items en une fois
 */
export const removeMultipleItemsSchema = z.object({
	cartItemIds: z
		.array(z.cuid2("ID de l'article invalide"))
		.min(1, "Au moins un article à supprimer")
		.max(50, "Maximum 50 articles supprimables en une fois"),
});

// `reorderFromOrderSchema` retiré avec l'action `reorder-from-order.ts` : son
// unique déclencheur était le bouton « Racheter » de la page détail de commande,
// disparue avec l'espace client (2026-07-31).

// `moveToWishlistSchema` retiré avec l'action `move-to-wishlist.ts` (audit
// wishlist 2026-08-01) : endpoint RPC sans appelant UI, qui clait de surcroît
// la wishlist sur le sessionId du cookie PANIER — un invité perdait l'article.
