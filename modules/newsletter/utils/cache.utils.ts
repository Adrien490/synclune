/**
 * Helpers de cache pour le module Newsletter
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des abonnés newsletter
 * - Utilisé pour : /admin/marketing/newsletter
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheNewsletterSubscribers() {
	cacheLife("dashboard");
	cacheTag(NEWSLETTER_CACHE_TAGS.LIST);
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification d'un abonnement newsletter
 */
export function getNewsletterInvalidationTags(userId?: string): string[] {
	const tags: string[] = [NEWSLETTER_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];

	if (userId) {
		tags.push(NEWSLETTER_CACHE_TAGS.USER_STATUS(userId));
	}

	return tags;
}
