/**
 * Helpers de cache pour le module Wishlist
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { WISHLIST_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la wishlist d'un utilisateur/visiteur.
 *
 * Utilise le profile `checkout` (stale 1m / revalidate 30s / expire 5m,
 * voir `next.config.ts:cacheLife.checkout`) pour aligner la fraîcheur sur
 * les besoins UX : badge navbar quasi instantané, sync icône cœur entre
 * onglets, cohérence après mutation cross-device. Le profile `user` (2m/1m)
 * serait trop lent pour ces interactions à forte fréquence.
 */
export function cacheWishlist(userId?: string, sessionId?: string) {
	cacheLife("checkout");
	cacheTag(WISHLIST_CACHE_TAGS.WISHLIST(userId, sessionId));
}

/**
 * Configure le cache pour le compteur de wishlist.
 *
 * Profile `checkout` — voir `cacheWishlist` pour le rationale.
 */
export function cacheWishlistCount(userId?: string, sessionId?: string) {
	cacheLife("checkout");
	cacheTag(WISHLIST_CACHE_TAGS.COUNT(userId, sessionId));
}

/**
 * Configure le cache pour les Product IDs de la wishlist (lookups O(1) ProductCards).
 *
 * Profile `checkout` — voir `cacheWishlist` pour le rationale.
 */
export function cacheWishlistProductIds(userId?: string, sessionId?: string) {
	cacheLife("checkout");
	cacheTag(WISHLIST_CACHE_TAGS.PRODUCT_IDS(userId, sessionId));
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
 * - Les Product IDs dans la wishlist
 */
export function getWishlistInvalidationTags(userId?: string, sessionId?: string): string[] {
	return [
		WISHLIST_CACHE_TAGS.WISHLIST(userId, sessionId),
		WISHLIST_CACHE_TAGS.COUNT(userId, sessionId),
		WISHLIST_CACHE_TAGS.PRODUCT_IDS(userId, sessionId),
	];
}
