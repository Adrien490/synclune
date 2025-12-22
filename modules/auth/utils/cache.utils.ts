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
 * Applique le cache pour les sessions admin (dashboard)
 */
export function cacheAuthSessions() {
	cacheLife("dashboard");
	cacheTag(AUTH_CACHE_TAGS.SESSIONS_LIST);
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
export function getAuthSessionInvalidationTags(sessionId?: string): string[] {
	const tags: string[] = [AUTH_CACHE_TAGS.SESSIONS_LIST];
	if (sessionId) {
		tags.push(AUTH_CACHE_TAGS.SESSION(sessionId));
	}
	return tags;
}

/**
 * Retourne les tags à invalider pour une vérification
 */
export function getAuthVerificationInvalidationTags(): string[] {
	return [AUTH_CACHE_TAGS.VERIFICATIONS_LIST];
}
