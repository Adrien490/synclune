/**
 * Tags de cache pour le module Newsletter
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const NEWSLETTER_CACHE_TAGS = {
	/** Liste des abonnés newsletter (dashboard admin) */
	LIST: "newsletter-subscribers-list",

	/** Statut d'abonnement d'un utilisateur */
	USER_STATUS: (userId: string) => `newsletter-user-${userId}`,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheNewsletterSubscribers,
	getNewsletterInvalidationTags,
} from "../utils/cache.utils";
