/**
 * Tags de cache pour le module Wishlist
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const WISHLIST_CACHE_TAGS = {
	/** Wishlist d'un utilisateur ou visiteur */
	WISHLIST: (userId?: string, sessionId?: string) =>
		userId ? `wishlist-user-${userId}` : sessionId ? `wishlist-session-${sessionId}` : "wishlist-anonymous",

	/** Compteur d'items dans une wishlist */
	COUNT: (userId?: string, sessionId?: string) =>
		userId
			? `wishlist-count-user-${userId}`
			: sessionId
				? `wishlist-count-session-${sessionId}`
				: "wishlist-count-anonymous",

	/** Set des Product IDs dans la wishlist (pour lookups O(1) dans ProductCards) */
	PRODUCT_IDS: (userId?: string, sessionId?: string) =>
		userId
			? `wishlist-products-user-${userId}`
			: sessionId
				? `wishlist-products-session-${sessionId}`
				: "wishlist-products-anonymous",
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheWishlist,
	cacheWishlistCount,
	getWishlistInvalidationTags,
} from "../utils/cache.utils";
