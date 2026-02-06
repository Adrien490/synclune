/**
 * Tags de cache pour le module Users
 *
 * Fonctions: voir utils/cache.utils.ts
 */

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

	/** Liste des comptes utilisateurs (admin dashboard) */
	ACCOUNTS_LIST: "accounts-list",
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheCurrentUser,
	cacheUserSessions,
	cacheUserAccounts,
	getCurrentUserInvalidationTags,
	getSessionInvalidationTags,
	getUserSessionsInvalidationTags,
	getUserAccountsInvalidationTags,
	getAdminAccountsListInvalidationTags,
	getUserFullInvalidationTags,
} from "../utils/cache.utils";
