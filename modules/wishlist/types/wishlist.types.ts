import type { Product } from "@/modules/products/types/product.types";

// ============================================================================
// TYPES - WISHLIST
// ============================================================================

/**
 * Retour de getWishlist.
 *
 * Les items sont directement des produits (payload `GET_PRODUCTS_SELECT`,
 * même shape que la PLP → compatible ProductCard) : depuis le retrait de la
 * base (2026-08-03), il n'existe plus de ligne `WishlistItem` intermédiaire —
 * le cookie `wishlist` porte les Product IDs, la DB ne sert qu'à les
 * matérialiser.
 */
export type GetWishlistReturn = {
	/** Produits favoris, plus récent en premier (ordre du cookie) */
	items: Product[];
	/** Nombre de favoris encore publics (== items.length) */
	totalCount: number;
};

// ============================================================================
// TYPES - WISHLIST ITEM COUNT
// ============================================================================

/**
 * Return type for getWishlistItemCount
 * Returns just the count as a number (used for badge display)
 */
export type GetWishlistItemCountReturn = number;
