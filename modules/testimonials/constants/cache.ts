/**
 * Cache configuration for Testimonials module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const TESTIMONIALS_CACHE_TAGS = {
	/** Liste des témoignages publiés (storefront) */
	LIST: "testimonials-list",

	/** Liste admin (tous les témoignages) */
	ADMIN_LIST: "testimonials-admin-list",

	/** Détail d'un témoignage */
	DETAIL: (id: string) => `testimonial-${id}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des témoignages publiés (storefront)
 * - Utilisé pour : Homepage, page témoignages
 * - Durée : Cache long (référentiel rarement modifié)
 */
export function cacheTestimonials() {
	cacheLife("reference")
	cacheTag(TESTIMONIALS_CACHE_TAGS.LIST)
}

/**
 * Configure le cache pour la liste admin
 * - Utilisé pour : /admin/marketing/temoignages
 * - Durée : Cache court (dashboard)
 */
export function cacheTestimonialsAdmin() {
	cacheLife("dashboard")
	cacheTag(TESTIMONIALS_CACHE_TAGS.ADMIN_LIST)
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification d'un témoignage
 */
export function getTestimonialInvalidationTags(id?: string): string[] {
	const tags: string[] = [
		TESTIMONIALS_CACHE_TAGS.LIST,
		TESTIMONIALS_CACHE_TAGS.ADMIN_LIST,
	]

	if (id) {
		tags.push(TESTIMONIALS_CACHE_TAGS.DETAIL(id))
	}

	return tags
}
