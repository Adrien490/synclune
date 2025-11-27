/**
 * Cache configuration for Newsletter module
 */

import { cacheLife, cacheTag } from "next/cache"
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache"

// ============================================
// CACHE TAGS
// ============================================

export const NEWSLETTER_CACHE_TAGS = {
	/** Liste des abonnés newsletter (dashboard admin) */
	LIST: "newsletter-subscribers-list",

	/** Statut d'abonnement d'un utilisateur */
	USER_STATUS: (userId: string) => `newsletter-user-${userId}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des abonnés newsletter
 * - Utilisé pour : /admin/marketing/newsletter
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheNewsletterSubscribers() {
	cacheLife("dashboard")
	cacheTag(NEWSLETTER_CACHE_TAGS.LIST)
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification d'un abonnement newsletter
 */
export function getNewsletterInvalidationTags(userId?: string): string[] {
	const tags: string[] = [NEWSLETTER_CACHE_TAGS.LIST, DASHBOARD_CACHE_TAGS.BADGES]

	if (userId) {
		tags.push(NEWSLETTER_CACHE_TAGS.USER_STATUS(userId))
	}

	return tags
}
