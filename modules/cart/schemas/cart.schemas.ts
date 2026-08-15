import { z } from "zod";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "../constants/cart";

// ============================================================================
// CART ITEM SCHEMAS
// ============================================================================

export const addToCartSchema = z.object({
	variantId: z.cuid2("ID VARIANT invalide"),
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

// ⚠️ Les lignes du panier sont identifiées par leur `variantId` depuis le passage en
// cookie (2026-08-04) : il n'existe plus de table `CartItem`, donc plus
// d'identifiant propre à la ligne. Le cookie dédoublonne par VARIANT, comme le
// faisait la contrainte `@@unique([cartId, variantId])`.

/**
 * Schéma de validation pour la mise à jour d'un item
 */
export const updateCartItemSchema = z.object({
	variantId: z.cuid2("ID de l'article invalide"),
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
	variantId: z.cuid2("ID de l'article invalide"),
});

// ============================================================================
// VARIANT VALIDATION SCHEMAS
// ============================================================================

import { CART_ERROR_MESSAGES } from "../constants/error-messages";

// ============================================================================
// CART METADATA SCHEMAS (P1 + P2 + P3)
// ============================================================================

// `removeMultipleItemsSchema` retiré avec l'action `remove-multiple-items.ts`
// (audit schéma V4, 2026-08-05) : endpoint RPC public sans aucun déclencheur UI —
// le panier ne propose que la suppression ligne à ligne (`remove-from-cart`) et le
// retrait des articles indisponibles (`remove-unavailable-items`), qui a sa propre
// action parce qu'il calcule lui-même la liste.

// `reorderFromOrderSchema` retiré avec l'action `reorder-from-order.ts` : son
// unique déclencheur était le bouton « Racheter » de la page détail de commande,
// disparue avec l'espace client (2026-07-31).

// `moveToWishlistSchema` retiré avec l'action `move-to-wishlist.ts` (audit
// wishlist 2026-08-01) : endpoint RPC sans appelant UI, qui clait de surcroît
// la wishlist sur le sessionId du cookie PANIER — un invité perdait l'article.
