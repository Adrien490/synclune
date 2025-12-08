/**
 * Helpers de cache pour le module Cart
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { CART_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour le panier d'un utilisateur/visiteur
 * - Durée : 5 minutes (stale: 300s) pour réduire la charge serveur
 */
export function cacheCart(userId?: string, sessionId?: string) {
	cacheLife("cart");
	cacheTag(CART_CACHE_TAGS.CART(userId, sessionId));
}

/**
 * Configure le cache pour le compteur de panier
 * - Durée : 5 minutes (stale: 300s) pour réduire la charge serveur
 */
export function cacheCartCount(userId?: string, sessionId?: string) {
	cacheLife("cart");
	cacheTag(CART_CACHE_TAGS.COUNT(userId, sessionId));
}

/**
 * Configure le cache pour le résumé du panier
 * - Durée : 5 minutes (stale: 300s) pour réduire la charge serveur
 */
export function cacheCartSummary(userId?: string, sessionId?: string) {
	cacheLife("cart");
	cacheTag(CART_CACHE_TAGS.SUMMARY(userId, sessionId));
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
	];
}
