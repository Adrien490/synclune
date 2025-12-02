import { cacheLife, cacheTag } from "next/cache";

/**
 * Tags de cache pour le module Auth
 * Utilisés pour l'invalidation ciblée du cache
 */
export const AUTH_CACHE_TAGS = {
	// Sessions
	SESSIONS_LIST: "auth-sessions-list",
	SESSION: (id: string) => `auth-session-${id}` as const,

	// Verifications
	VERIFICATIONS_LIST: "auth-verifications-list",
	VERIFICATION: (id: string) => `auth-verification-${id}` as const,
} as const;

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
export function getAuthVerificationInvalidationTags(verificationId?: string): string[] {
	const tags: string[] = [AUTH_CACHE_TAGS.VERIFICATIONS_LIST];
	if (verificationId) {
		tags.push(AUTH_CACHE_TAGS.VERIFICATION(verificationId));
	}
	return tags;
}
