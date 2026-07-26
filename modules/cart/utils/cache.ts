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
 * - Profil `checkout` (60s stale / 30s revalidate / 5min expire)
 */
export function cacheCart(userId?: string, sessionId?: string) {
	cacheLife("checkout");
	cacheTag(CART_CACHE_TAGS.CART(userId, sessionId));
}

/**
 * Configure le cache pour le résumé du panier
 * - Profil `checkout` (60s stale / 30s revalidate / 5min expire)
 */
export function cacheCartSummary(userId?: string, sessionId?: string) {
	cacheLife("checkout");
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
