/**
 * Cache configuration for Wishlist module
 */

import { cacheLife, cacheTag } from "next/cache"

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
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la wishlist d'un utilisateur/visiteur
 * - Durée : 5min fraîche, 1min revalidation, 1h expiration
 */
export function cacheWishlist(userId?: string, sessionId?: string) {
	cacheLife("cart")
	cacheTag(WISHLIST_CACHE_TAGS.WISHLIST(userId, sessionId))
}

/**
 * Configure le cache pour le compteur de wishlist
 * - Durée : 5min fraîche, 1min revalidation, 1h expiration
 */
export function cacheWishlistCount(userId?: string, sessionId?: string) {
	cacheLife("cart")
	cacheTag(WISHLIST_CACHE_TAGS.COUNT(userId, sessionId))
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification de la wishlist
 *
 * Invalide automatiquement :
 * - La wishlist de l'utilisateur/visiteur
 * - Le compteur d'items dans la wishlist
 * - Les items de la wishlist (si wishlistId fourni)
 */
export function getWishlistInvalidationTags(userId?: string, sessionId?: string, wishlistId?: string): string[] {
	const tags = [WISHLIST_CACHE_TAGS.WISHLIST(userId, sessionId), WISHLIST_CACHE_TAGS.COUNT(userId, sessionId)]

	if (wishlistId) {
		tags.push(WISHLIST_CACHE_TAGS.ITEMS(wishlistId))
	}

	return tags
}
