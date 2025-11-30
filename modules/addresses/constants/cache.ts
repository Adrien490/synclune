/**
 * Cache configuration for Addresses module
 */

import { cacheLife, cacheTag } from "next/cache";

// ============================================
// CACHE TAGS
// ============================================

export const ADDRESSES_CACHE_TAGS = {
	/** Adresses d'un utilisateur */
	USER_ADDRESSES: (userId: string) => `addresses-user-${userId}`,

	/** Adresse par défaut d'un utilisateur */
	DEFAULT_ADDRESS: (userId: string) => `address-default-${userId}`,

	/** Recherche d'adresses via l'API BAN (autocomplete) */
	ADDRESS_SEARCH: (query: string) => `address-search-${query}`,
} as const;

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les adresses d'un utilisateur
 * - Utilisé pour : /account/profile, sélection d'adresse
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheUserAddresses(userId: string) {
	cacheLife("dashboard"); // Réutilise le profil dashboard (1min)
	cacheTag(ADDRESSES_CACHE_TAGS.USER_ADDRESSES(userId));
}

/**
 * Configure le cache pour la recherche d'adresses (API publique BAN)
 * - Utilisé pour : autocomplétion d'adresse
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 * - Les données de l'API BAN sont fixes et changent très rarement
 */
export function cacheAddressSearch(query: string) {
	cacheLife("reference"); // Profil le plus long (30 jours d'expiration)
	cacheTag(ADDRESSES_CACHE_TAGS.ADDRESS_SEARCH(query));
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification des adresses d'un utilisateur
 */
export function getUserAddressesInvalidationTags(userId: string): string[] {
	return [
		ADDRESSES_CACHE_TAGS.USER_ADDRESSES(userId),
		ADDRESSES_CACHE_TAGS.DEFAULT_ADDRESS(userId),
	];
}
