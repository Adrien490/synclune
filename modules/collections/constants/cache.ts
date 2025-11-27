/**
 * Cache configuration for Collections module
 */

import { cacheLife, cacheTag } from "next/cache"
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache"

// ============================================
// CACHE TAGS
// ============================================

export const COLLECTIONS_CACHE_TAGS = {
	/** Liste de toutes les collections */
	LIST: "collections-list",

	/** Détail d'une collection spécifique */
	DETAIL: (slug: string) => `collection-${slug}`,

	/** Produits d'une collection */
	PRODUCTS: (slug: string) => `collection-${slug}-products`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les collections
 * - Utilisé pour : /collections, listes de collections
 * - Durée : 2h fraîche, 30min revalidation, 7j expiration
 */
export function cacheCollections() {
	cacheLife("collections")
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST)
}

/**
 * Configure le cache pour une collection et ses produits
 * - Utilisé pour : /collections/[slug]
 * - Durée : 2h fraîche, 30min revalidation, 7j expiration
 */
export function cacheCollectionDetail(slug: string) {
	cacheLife("collections")
	cacheTag(COLLECTIONS_CACHE_TAGS.DETAIL(slug), COLLECTIONS_CACHE_TAGS.PRODUCTS(slug), COLLECTIONS_CACHE_TAGS.LIST)
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'une collection
 *
 * Invalide automatiquement :
 * - La liste des collections
 * - Le détail de la collection
 * - Les produits de la collection
 * - La liste des produits (car ils affichent leur collection)
 */
export function getCollectionInvalidationTags(collectionSlug: string): string[] {
	return [
		COLLECTIONS_CACHE_TAGS.LIST,
		COLLECTIONS_CACHE_TAGS.DETAIL(collectionSlug),
		COLLECTIONS_CACHE_TAGS.PRODUCTS(collectionSlug),
		PRODUCTS_CACHE_TAGS.LIST, // Les produits affichent leur collection
	]
}
