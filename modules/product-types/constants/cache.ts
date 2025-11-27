/**
 * Cache configuration for Product Types module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const PRODUCT_TYPES_CACHE_TAGS = {
	/** Liste des types de produits */
	LIST: "product-types",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les types de produits
 * - Utilisé pour : sélecteurs de filtres, formulaires admin
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 */
export function cacheProductTypes() {
	cacheLife("reference")
	cacheTag(PRODUCT_TYPES_CACHE_TAGS.LIST)
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'un type de produit
 */
export function getProductTypeInvalidationTags(): string[] {
	return [PRODUCT_TYPES_CACHE_TAGS.LIST]
}
