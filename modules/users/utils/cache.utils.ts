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
 * - Profil `checkout` : 1min stale, 30s revalidation, 5min expiration (fraîcheur session)
 */
export function cacheCurrentUser(userId: string) {
	cacheLife("checkout");
	cacheTag(USERS_CACHE_TAGS.CURRENT_USER(userId));
}

/**
 * Configure le cache pour les comptes OAuth liés d'un utilisateur
 * - Utilisé pour : /account/security, gestion des comptes liés
 * - Profil `user` : 2min stale, 1min revalidation, 10min expiration
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
 * All cache tags to invalidate when an admin modifies a user
 * Covers: user data, sessions list, order count
 */
export function getUserFullInvalidationTags(userId: string): string[] {
	return [
		USERS_CACHE_TAGS.CURRENT_USER(userId),
		SESSION_CACHE_TAGS.SESSIONS(userId),
		USERS_CACHE_TAGS.USER_ORDERS_COUNT(userId),
	];
}
