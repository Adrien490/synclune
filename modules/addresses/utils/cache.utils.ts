/**
 * Helpers de cache pour le module Addresses
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { ADDRESSES_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les adresses d'un utilisateur
 * - Utilisé pour : /account/profile, sélection d'adresse
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheUserAddresses(userId: string) {
	cacheLife("dashboard");
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
	return [
		ADDRESSES_CACHE_TAGS.USER_ADDRESSES(userId),
		ADDRESSES_CACHE_TAGS.DEFAULT_ADDRESS(userId),
	];
}
