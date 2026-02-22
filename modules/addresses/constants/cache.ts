/**
 * Cache tags et helpers pour le module Addresses
 */

import { cacheLife, cacheTag } from "next/cache";

// ============================================
// CACHE TAGS
// ============================================

export const ADDRESSES_CACHE_TAGS = {
	/** Adresses d'un utilisateur */
	USER_ADDRESSES: (userId: string) => `addresses-user-${userId}`,

	/** Recherche d'adresses via l'API BAN (autocomplete) */
	ADDRESS_SEARCH: (query: string) => `address-search-${query}`,
} as const;

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les adresses d'un utilisateur
 * - Utilisé pour : /account/profile, sélection d'adresse
 * - Durée : 5min fraîche, 1min revalidation
 */
export function cacheUserAddresses(userId: string) {
	cacheLife("cart");
	cacheTag(ADDRESSES_CACHE_TAGS.USER_ADDRESSES(userId));
}

/**
 * Configure le cache pour la recherche d'adresses (API publique BAN)
 * - Utilisé pour : autocomplétion d'adresse
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 * - Les données de l'API BAN sont fixes et changent très rarement
 */
export function cacheAddressSearch(query: string) {
	cacheLife("reference");
	cacheTag(ADDRESSES_CACHE_TAGS.ADDRESS_SEARCH(query));
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification des adresses d'un utilisateur
 */
export function getUserAddressesInvalidationTags(userId: string): string[] {
	return [ADDRESSES_CACHE_TAGS.USER_ADDRESSES(userId)];
}
