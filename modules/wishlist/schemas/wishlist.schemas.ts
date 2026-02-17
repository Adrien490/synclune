import { z } from "zod";

// ============================================================================
// WISHLIST PRODUCT SCHEMA (shared by add, remove, toggle)
// ============================================================================

export const wishlistProductSchema = z.object({
	productId: z.cuid2({ message: 'Produit invalide' }),
});

export type WishlistProductInput = z.infer<typeof wishlistProductSchema>;

// Aliases for semantic clarity in action imports
export const addToWishlistSchema = wishlistProductSchema;
export const removeFromWishlistSchema = wishlistProductSchema;
export const toggleWishlistItemSchema = wishlistProductSchema;
