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
 * Configure le cache pour la wishlist d'un utilisateur/visiteur
 * - Durée : 5min fraîche, 1min revalidation, 1h expiration
 *
 * Note: Utilise le profile "cart" intentionnellement car wishlist et panier
 * ont le même cycle de vie : données personnelles nécessitant une fraîcheur
 * similaire pour les mises à jour en temps réel (badges header, listes).
 * Si les besoins divergent, créer un profile "wishlist" dans next.config.ts.
 */
export function cacheWishlist(userId?: string, sessionId?: string) {
	cacheLife("cart");
	cacheTag(WISHLIST_CACHE_TAGS.WISHLIST(userId, sessionId));
}

/**
 * Configure le cache pour le compteur de wishlist
 * - Durée : 5min fraîche, 1min revalidation, 1h expiration
 *
 * Note: Même profile "cart" que cacheWishlist() - voir documentation ci-dessus.
 */
export function cacheWishlistCount(userId?: string, sessionId?: string) {
	cacheLife("cart");
	cacheTag(WISHLIST_CACHE_TAGS.COUNT(userId, sessionId));
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
 * - Les SKU IDs dans la wishlist
 */
export function getWishlistInvalidationTags(userId?: string, sessionId?: string): string[] {
	return [
		WISHLIST_CACHE_TAGS.WISHLIST(userId, sessionId),
		WISHLIST_CACHE_TAGS.COUNT(userId, sessionId),
		WISHLIST_CACHE_TAGS.SKU_IDS(userId, sessionId),
	];
}
