/**
 * Tags de cache pour le module Wishlist
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const WISHLIST_CACHE_TAGS = {
	/** Liste des wishlists (dashboard admin) */
	LIST: "wishlists-list",

	/** Wishlist d'un utilisateur ou visiteur */
	WISHLIST: (userId?: string, sessionId?: string) =>
		userId ? `wishlist-user-${userId}` : sessionId ? `wishlist-session-${sessionId}` : "wishlist-anonymous",

	/** Items d'une wishlist spécifique */
	ITEMS: (wishlistId: string) => `wishlist-${wishlistId}-items`,

	/** Compteur d'items dans une wishlist */
	COUNT: (userId?: string, sessionId?: string) =>
		userId
			? `wishlist-count-user-${userId}`
			: sessionId
				? `wishlist-count-session-${sessionId}`
				: "wishlist-count-anonymous",

	/** Set des SKU IDs dans la wishlist (pour lookups O(1) dans ProductCards) */
	SKU_IDS: (userId?: string, sessionId?: string) =>
		userId
			? `wishlist-skus-user-${userId}`
			: sessionId
				? `wishlist-skus-session-${sessionId}`
				: "wishlist-skus-anonymous",
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheWishlist,
	cacheWishlistCount,
	getWishlistInvalidationTags,
} from "../utils/cache.utils";
