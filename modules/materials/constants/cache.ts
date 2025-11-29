/**
 * Cache configuration for Materials module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const MATERIALS_CACHE_TAGS = {
	/** Liste des matériaux */
	LIST: "materials-list",

	/** Détail d'un matériau spécifique */
	DETAIL: (slug: string) => `material-${slug}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des matériaux
 * - Utilisé pour : sélecteurs de filtres, formulaires admin
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 */
export function cacheMaterials() {
	cacheLife("reference")
	cacheTag(MATERIALS_CACHE_TAGS.LIST)
}

/**
 * Configure le cache pour un matériau spécifique
 * - Utilisé pour : page détail matériau
 * - Durée : 4h fraîche, 1h revalidation, 30j expiration
 */
export function cacheMaterialDetail(slug: string) {
	cacheLife("reference")
	cacheTag(MATERIALS_CACHE_TAGS.DETAIL(slug), MATERIALS_CACHE_TAGS.LIST)
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'un matériau
 * @param materialSlug - Slug du matériau (optionnel pour création/bulk)
 */
export function getMaterialInvalidationTags(materialSlug?: string): string[] {
	const tags = [MATERIALS_CACHE_TAGS.LIST as string];

	if (materialSlug) {
		tags.push(MATERIALS_CACHE_TAGS.DETAIL(materialSlug));
	}

	return tags;
}
