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

	/** Sessions actives d'un utilisateur */
	SESSIONS: (userId: string) => `sessions-user-${userId}`,

	/** Comptes OAuth liés d'un utilisateur */
	ACCOUNTS: (userId: string) => `accounts-user-${userId}`,
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
