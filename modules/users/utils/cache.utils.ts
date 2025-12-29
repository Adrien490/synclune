/**
 * Helpers de cache pour le module Users
 *
 * Constantes: voir constants/cache.ts
 * Note: getSessionInvalidationTags est maintenant dans @/shared/constants/cache-tags
 */

import { cacheLife, cacheTag } from "next/cache";
import {
	getSessionInvalidationTags as getSessionInvalidationTagsShared,
	SESSION_CACHE_TAGS,
} from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour l'utilisateur courant
 * - Utilisé pour : session, profil utilisateur
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheCurrentUser(userId: string) {
	cacheLife("dashboard");
	cacheTag(USERS_CACHE_TAGS.CURRENT_USER(userId));
}

/**
 * Configure le cache pour les sessions d'un utilisateur
 * - Utilisé pour : /account/security, gestion des sessions actives
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 * @deprecated Utiliser cacheDefault(SESSION_CACHE_TAGS.SESSIONS(userId)) depuis @/shared
 */
export function cacheUserSessions(userId: string) {
	cacheLife("dashboard");
	cacheTag(SESSION_CACHE_TAGS.SESSIONS(userId));
}

/**
 * Configure le cache pour les comptes OAuth liés d'un utilisateur
 * - Utilisé pour : /account/security, gestion des comptes liés
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheUserAccounts(userId: string) {
	cacheLife("dashboard");
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
 * Tags à invalider lors de la modification de la session de l'utilisateur
 * (connexion, déconnexion, rafraîchissement de session)
 * @deprecated Utiliser getSessionInvalidationTags depuis @/shared/constants/cache-tags
 */
export function getSessionInvalidationTags(userId: string): string[] {
	return getSessionInvalidationTagsShared(userId);
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
