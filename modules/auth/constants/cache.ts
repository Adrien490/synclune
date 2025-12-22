/**
 * Tags de cache pour le module Auth
 *
 * Fonctions: voir utils/cache.utils.ts
 */

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
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheAuthSessions,
	cacheAuthSession,
	cacheAuthVerifications,
	getAuthSessionInvalidationTags,
	getAuthVerificationInvalidationTags,
} from "../utils/cache.utils";
