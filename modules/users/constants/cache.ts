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

	/** Comptes OAuth liés d'un utilisateur */
	ACCOUNTS: (userId: string) => `accounts-user-${userId}`,

	/** Liste des comptes utilisateurs (admin dashboard) */
	ACCOUNTS_LIST: "accounts-list",

	/** Nombre de commandes d'un utilisateur (page détail admin) */
	USER_ORDERS_COUNT: (userId: string) => `user-orders-count-${userId}`,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheCurrentUser,
	cacheUserAccounts,
	getCurrentUserInvalidationTags,
	getUserFullInvalidationTags,
	getUserOrdersCountInvalidationTags,
} from "../utils/cache.utils";
