import { z } from "zod";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

// ============================================================================
// WISHLIST PRODUCT SCHEMA (shared by add, remove, toggle)
// ============================================================================

export const wishlistProductSchema = z.object({
	productId: z.cuid2({ message: "Produit invalide" }),
});

type WishlistProductInput = z.infer<typeof wishlistProductSchema>;

// Aliases for semantic clarity in action imports
export const addToWishlistSchema = wishlistProductSchema;
export const removeFromWishlistSchema = wishlistProductSchema;
export const toggleWishlistItemSchema = wishlistProductSchema;

// ============================================================================
// MOVE TO CART SCHEMA
// ============================================================================

export const moveToCartSchema = z.object({
	productId: z.cuid2({ message: "Produit invalide" }),
	skuId: z.cuid2({ message: "Variante invalide" }),
	quantity: z
		.number()
		.int()
		.min(1, "Quantite minimale: 1")
		.max(MAX_QUANTITY_PER_ORDER, `Quantite maximale: ${MAX_QUANTITY_PER_ORDER}`)
		.default(1),
});
