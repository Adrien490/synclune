/**
 * Cache configuration for Cart module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const CART_CACHE_TAGS = {
	/** Panier d'un utilisateur ou visiteur */
	CART: (userId?: string, sessionId?: string) =>
		userId ? `cart-user-${userId}` : sessionId ? `cart-session-${sessionId}` : "cart-anonymous",

	/** Compteur d'items dans le panier */
	COUNT: (userId?: string, sessionId?: string) =>
		userId ? `cart-count-user-${userId}` : sessionId ? `cart-count-session-${sessionId}` : "cart-count-anonymous",

	/** Résumé du panier (pour tableau de bord) */
	SUMMARY: (userId?: string, sessionId?: string) =>
		userId ? `cart-summary-user-${userId}` : sessionId ? `cart-summary-session-${sessionId}` : "cart-summary-anonymous",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour le panier d'un utilisateur/visiteur
 * - Durée : 5 minutes (stale: 300s) pour réduire la charge serveur
 */
export function cacheCart(userId?: string, sessionId?: string) {
	cacheLife("cart")
	cacheTag(CART_CACHE_TAGS.CART(userId, sessionId))
}

/**
 * Configure le cache pour le compteur de panier
 * - Durée : 5 minutes (stale: 300s) pour réduire la charge serveur
 */
export function cacheCartCount(userId?: string, sessionId?: string) {
	cacheLife("cart")
	cacheTag(CART_CACHE_TAGS.COUNT(userId, sessionId))
}

/**
 * Configure le cache pour le résumé du panier
 * - Durée : 5 minutes (stale: 300s) pour réduire la charge serveur
 */
export function cacheCartSummary(userId?: string, sessionId?: string) {
	cacheLife("cart")
	cacheTag(CART_CACHE_TAGS.SUMMARY(userId, sessionId))
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification du panier
 *
 * Invalide automatiquement :
 * - Le panier de l'utilisateur/visiteur
 * - Le compteur d'items dans le panier
 * - Le résumé du panier
 */
export function getCartInvalidationTags(userId?: string, sessionId?: string): string[] {
	return [
		CART_CACHE_TAGS.CART(userId, sessionId),
		CART_CACHE_TAGS.COUNT(userId, sessionId),
		CART_CACHE_TAGS.SUMMARY(userId, sessionId),
	]
}
