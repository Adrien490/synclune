import { z } from "zod";
import { MAX_QUANTITY_PER_ORDER } from "../constants/cart";

// ============================================================================
// CART ITEM SCHEMAS
// ============================================================================

export const addToCartSchema = z.object({
	skuId: z.cuid2("ID SKU invalide"),
	quantity: z.number().int().min(1, "Quantité minimale: 1").max(MAX_QUANTITY_PER_ORDER, `Quantité maximale: ${MAX_QUANTITY_PER_ORDER}`).default(1),
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
 * Schema pour valider un SKU et son stock
 */
export const validateSkuSchema = z.object({
	skuId: z.string().min(1, CART_ERROR_MESSAGES.SKU_NOT_FOUND),
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
	skuId: z.string().min(1, CART_ERROR_MESSAGES.SKU_NOT_FOUND),
});
