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
	/** Per-user sessions tag (non-admin users) */
	SESSIONS_USER: (userId: string) => `auth-sessions-${userId}` as const,

	// Verifications
	VERIFICATIONS_LIST: "auth-verifications-list",

	// Providers
	/** OAuth/credential providers of a specific user */
	USER_PROVIDERS: (userId: string) => `user-providers-${userId}` as const,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheAuthSessions,
	cacheAuthSession,
	cacheAuthVerifications,
	getAuthSessionInvalidationTags,
	getAuthVerificationInvalidationTags,
	getUserProvidersInvalidationTags,
} from "../utils/cache.utils";
