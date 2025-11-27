/**
 * Cache configuration for Users module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const USERS_CACHE_TAGS = {
	/** Données de l'utilisateur courant */
	CURRENT_USER: (userId: string) => `user-${userId}`,

	/** Session de l'utilisateur courant */
	SESSION: (userId: string) => `session-${userId}`,

	/** Adresses d'un utilisateur */
	ADDRESSES: (userId: string) => `addresses-user-${userId}`,

	/** Adresse par défaut d'un utilisateur */
	DEFAULT_ADDRESS: (userId: string) => `address-default-${userId}`,

	/** Sessions actives d'un utilisateur */
	SESSIONS: (userId: string) => `sessions-user-${userId}`,

	/** Comptes OAuth liés d'un utilisateur */
	ACCOUNTS: (userId: string) => `accounts-user-${userId}`,

	/** Recherche d'adresses via l'API BAN (autocomplete) */
	ADDRESS_SEARCH: (query: string) => `address-search-${query}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour l'utilisateur courant
 * - Utilisé pour : session, profil utilisateur
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheCurrentUser(userId: string) {
	cacheLife("dashboard") // Réutilise le profil dashboard (1min)
	cacheTag(USERS_CACHE_TAGS.CURRENT_USER(userId))
}

/**
 * Configure le cache pour les adresses d'un utilisateur
 * - Utilisé pour : /account/profile, sélection d'adresse
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheUserAddresses(userId: string) {
	cacheLife("dashboard") // Réutilise le profil dashboard (1min)
	cacheTag(USERS_CACHE_TAGS.ADDRESSES(userId))
}

/**
 * Configure le cache pour les sessions d'un utilisateur
 * - Utilisé pour : /account/security, gestion des sessions actives
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheUserSessions(userId: string) {
	cacheLife("dashboard") // Réutilise le profil dashboard (1min)
	cacheTag(USERS_CACHE_TAGS.SESSIONS(userId))
}

/**
 * Configure le cache pour les comptes OAuth liés d'un utilisateur
 * - Utilisé pour : /account/security, gestion des comptes liés
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheUserAccounts(userId: string) {
	cacheLife("dashboard") // Réutilise le profil dashboard (1min)
	cacheTag(USERS_CACHE_TAGS.ACCOUNTS(userId))
}

/**
 * Configure le cache pour la recherche d'adresses (API publique BAN)
 * - Utilisé pour : autocomplétion d'adresse
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 * - Les données de l'API BAN sont fixes et changent très rarement
 */
export function cacheAddressSearch(query: string) {
	cacheLife("reference") // Profil le plus long (30 jours d'expiration)
	cacheTag(USERS_CACHE_TAGS.ADDRESS_SEARCH(query))
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification du profil utilisateur
 */
export function getCurrentUserInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.CURRENT_USER(userId)]
}

/**
 * Tags à invalider lors de la modification de la session de l'utilisateur
 * (connexion, déconnexion, rafraîchissement de session)
 */
export function getSessionInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.SESSION(userId)]
}

/**
 * Tags à invalider lors de la modification des adresses d'un utilisateur
 */
export function getUserAddressesInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.ADDRESSES(userId), USERS_CACHE_TAGS.DEFAULT_ADDRESS(userId)]
}

/**
 * Tags à invalider lors de la modification des sessions d'un utilisateur
 */
export function getUserSessionsInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.SESSIONS(userId)]
}

/**
 * Tags à invalider lors de la modification des comptes OAuth d'un utilisateur
 */
export function getUserAccountsInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.ACCOUNTS(userId)]
}
