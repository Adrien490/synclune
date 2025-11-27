/**
 * Cache configuration for Colors module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const COLORS_CACHE_TAGS = {
	/** Liste des couleurs */
	LIST: "colors",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les couleurs
 * - Utilisé pour : sélecteurs de filtres, formulaires admin
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 */
export function cacheColors() {
	cacheLife("reference")
	cacheTag(COLORS_CACHE_TAGS.LIST)
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'une couleur
 */
export function getColorInvalidationTags(): string[] {
	return [COLORS_CACHE_TAGS.LIST]
}
