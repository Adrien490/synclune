/**
 * Helpers de cache pour le module Users
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SESSION_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour l'utilisateur courant
 * - Utilisé pour : session, profil utilisateur
 * - Profil "session" : 1min stale, 30s revalidation, 5min expiration (sémantique user)
 */
export function cacheCurrentUser(userId: string) {
	cacheLife("checkout");
	cacheTag(USERS_CACHE_TAGS.CURRENT_USER(userId));
}

/**
 * Configure le cache pour les comptes OAuth liés d'un utilisateur
 * - Utilisé pour : /account/security, gestion des comptes liés
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheUserAccounts(userId: string) {
	cacheLife("user");
	cacheTag(USERS_CACHE_TAGS.ACCOUNTS(userId));
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification du profil utilisateur
 */
export function getCurrentUserInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.CURRENT_USER(userId)];
}

/**
 * Tags à invalider lors de la modification des sessions d'un utilisateur
 */
export function getUserSessionsInvalidationTags(userId: string): string[] {
	return [SESSION_CACHE_TAGS.SESSIONS(userId)];
}

/**
 * Tags à invalider lors de la modification des comptes OAuth d'un utilisateur
 */
export function getUserAccountsInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.ACCOUNTS(userId)];
}

/**
 * Tags à invalider lors de la modification d'un utilisateur (admin)
 * Inclut la liste des comptes OAuth
 */
export function getAdminAccountsListInvalidationTags(): string[] {
	return [USERS_CACHE_TAGS.ACCOUNTS_LIST];
}

/**
 * All cache tags to invalidate when an admin modifies a user
 * Covers: user data, session, sessions list, order count
 */
export function getUserFullInvalidationTags(userId: string): string[] {
	return [
		USERS_CACHE_TAGS.CURRENT_USER(userId),
		SESSION_CACHE_TAGS.SESSION(userId),
		SESSION_CACHE_TAGS.SESSIONS(userId),
		USERS_CACHE_TAGS.USER_ORDERS_COUNT(userId),
	];
}

/**
 * Tags à invalider lors de la modification de la liste des commandes d'un user.
 * À appeler depuis chaque mutation orders qui change le compte de commandes
 * (création, soft-delete, restore) pour rafraîchir la page détail admin.
 */
export function getUserOrdersCountInvalidationTags(userId: string): string[] {
	return [USERS_CACHE_TAGS.USER_ORDERS_COUNT(userId)];
}
