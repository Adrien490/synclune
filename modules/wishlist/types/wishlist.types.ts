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
 * matérialiser. Pas de compteur dans le payload : le seul compteur affiché
 * est optimiste et vit dans `wishlist-list-content.tsx` (`items.length`).
 */
export type GetWishlistReturn = {
	/** Produits favoris, plus récent en premier (ordre du cookie) */
	items: Product[];
};
