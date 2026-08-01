/**
 * Cache tags et helpers pour le module Addresses
 */

import { cacheLife, cacheTag } from "next/cache";

// ============================================
// CACHE TAGS
// ============================================

// Non exporté depuis le retrait du carnet d'adresses : plus aucun mutateur à
// invalider, `cacheAddressSearch` ci-dessous est le seul consommateur. La
// constante reste la SSOT du tag — jamais de littéral template au call site.
const ADDRESSES_CACHE_TAGS = {
	/** Recherche d'adresses via l'API BAN (autocomplete) */
	ADDRESS_SEARCH: (query: string) => `address-search-${query.toLowerCase().trim()}`,
} as const;

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

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
