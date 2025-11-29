/**
 * Cache configuration for Materials module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const MATERIALS_CACHE_TAGS = {
	/** Liste des matériaux */
	LIST: "materials",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les matériaux
 * - Utilisé pour : sélecteurs de filtres, formulaires admin
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 */
export function cacheMaterials() {
	cacheLife("reference")
	cacheTag(MATERIALS_CACHE_TAGS.LIST)
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'un matériau
 */
export function getMaterialInvalidationTags(): string[] {
	return [MATERIALS_CACHE_TAGS.LIST]
}
