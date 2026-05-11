import { z } from "zod";
import { MAX_QUANTITY_PER_ORDER } from "../constants/cart";

// ============================================================================
// CART ITEM SCHEMAS
// ============================================================================

export const addToCartSchema = z.object({
	skuId: z.cuid("ID SKU invalide"),
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
	cartItemId: z.cuid("ID de l'article invalide"),
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
	cartItemId: z.cuid("ID de l'article invalide"),
});

// ============================================================================
// SKU VALIDATION SCHEMAS
// ============================================================================

import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Schema pour valider un SKU et son stock
 */
export const validateSkuSchema = z.object({
	skuId: z.cuid(CART_ERROR_MESSAGES.SKU_NOT_FOUND),
	quantity: z
		.number()
		.int()
		.min(1, CART_ERROR_MESSAGES.QUANTITY_MIN)
		.max(MAX_QUANTITY_PER_ORDER, CART_ERROR_MESSAGES.QUANTITY_MAX),
});

/**
 * Schema pour récupérer les détails d'un SKU
 */
export const getSkuDetailsSchema = z.object({
	skuId: z.cuid(CART_ERROR_MESSAGES.SKU_NOT_FOUND),
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
 * Schema pour definir les notes/instructions du panier.
 *
 * @security Texte libre — JAMAIS rendu via `dangerouslySetInnerHTML`. Tous les
 * consumers (admin order-detail, emails, exports) doivent utiliser un rendu
 * texte (React JSX text node ou `textContent`). Sinon : injecter DOMPurify ici.
 */
export const setCartNotesSchema = z.object({
	notes: z.string().max(500, CART_ERROR_MESSAGES.CART_NOTES_TOO_LONG).optional().default(""),
});

/**
 * Schema pour definir le mode de fulfillment
 */
export const setFulfillmentModeSchema = z.object({
	fulfillmentType: z.enum(["SHIPPING", "CLICK_AND_COLLECT"]),
});

/**
 * Schema pour configurer les options cadeau sur un item.
 *
 * @security `giftMessage` est du texte libre — mêmes contraintes que `setCartNotesSchema` :
 * rendu texte seul côté consumers, jamais `dangerouslySetInnerHTML`.
 */
export const setGiftOptionsSchema = z.object({
	cartItemId: z.cuid("ID de l'article invalide"),
	giftWrap: z.boolean().default(false),
	giftMessage: z
		.string()
		.max(300, CART_ERROR_MESSAGES.GIFT_MESSAGE_TOO_LONG)
		.optional()
		.transform((v) => (v === "" ? undefined : v)),
});

/**
 * Schema pour supprimer plusieurs items en une fois
 */
export const removeMultipleItemsSchema = z.object({
	cartItemIds: z
		.array(z.cuid("ID de l'article invalide"))
		.min(1, "Au moins un article à supprimer")
		.max(50, "Maximum 50 articles supprimables en une fois"),
});

/**
 * Schema pour réajouter les items d'une commande au panier
 */
export const reorderFromOrderSchema = z.object({
	orderId: z.cuid("ID de commande invalide"),
});

/**
 * Schema pour déplacer un item vers la wishlist
 */
export const moveToWishlistSchema = z.object({
	cartItemId: z.cuid("ID de l'article invalide"),
});
