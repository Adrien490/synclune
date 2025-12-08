/**
 * Tags de cache pour le module Addresses
 *
 * Fonctions: voir utils/cache.utils.ts
 */

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

// Re-exports pour retrocompatibilite
export {
	cacheUserAddresses,
	cacheAddressSearch,
	getUserAddressesInvalidationTags,
} from "../utils/cache.utils";
