/**
 * Helpers de cache pour le module Auth
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { AUTH_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Applique le cache pour les sessions
 * Uses user-specific tag for non-admin to prevent cross-user cache pollution
 */
export function cacheAuthSessions(userId?: string) {
	cacheLife("dashboard");
	if (userId) {
		cacheTag(AUTH_CACHE_TAGS.SESSIONS_USER(userId));
	} else {
		cacheTag(AUTH_CACHE_TAGS.SESSIONS_LIST);
	}
}

/**
 * Applique le cache pour une session spécifique
 */
export function cacheAuthSession(sessionId: string) {
	cacheLife("dashboard");
	cacheTag(AUTH_CACHE_TAGS.SESSION(sessionId));
}

/**
 * Applique le cache pour les vérifications admin
 */
export function cacheAuthVerifications() {
	cacheLife("dashboard");
	cacheTag(AUTH_CACHE_TAGS.VERIFICATIONS_LIST);
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Retourne les tags à invalider pour une session
 */
export function getAuthSessionInvalidationTags(sessionId?: string, userId?: string): string[] {
	const tags: string[] = [AUTH_CACHE_TAGS.SESSIONS_LIST];
	if (sessionId) {
		tags.push(AUTH_CACHE_TAGS.SESSION(sessionId));
	}
	if (userId) {
		tags.push(AUTH_CACHE_TAGS.SESSIONS_USER(userId));
	}
	return tags;
}

/**
 * Retourne les tags à invalider pour une vérification
 */
export function getAuthVerificationInvalidationTags(): string[] {
	return [AUTH_CACHE_TAGS.VERIFICATIONS_LIST];
}

/**
 * Retourne les tags à invalider pour les providers OAuth d'un utilisateur
 */
export function getUserProvidersInvalidationTags(userId: string): string[] {
	return [AUTH_CACHE_TAGS.USER_PROVIDERS(userId)];
}
