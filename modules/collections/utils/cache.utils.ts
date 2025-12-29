/**
 * Helpers de cache pour le module Collections
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les collections
 * - Utilisé pour : /collections, listes de collections
 * - Durée : 2h fraîche, 30min revalidation, 7j expiration
 */
export function cacheCollections() {
	cacheLife("collections");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour une collection et ses produits
 * - Utilisé pour : /collections/[slug]
 * - Durée : 2h fraîche, 30min revalidation, 7j expiration
 */
export function cacheCollectionDetail(slug: string) {
	cacheLife("collections");
	cacheTag(COLLECTIONS_CACHE_TAGS.DETAIL(slug), COLLECTIONS_CACHE_TAGS.PRODUCTS(slug), COLLECTIONS_CACHE_TAGS.LIST);
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'une collection
 *
 * Invalide automatiquement :
 * - La liste des collections
 * - Les compteurs de collections
 * - Le détail de la collection
 * - Les produits de la collection
 * - La liste des produits (car ils affichent leur collection)
 * - Les badges de la sidebar admin
 */
export function getCollectionInvalidationTags(collectionSlug: string): string[] {
	return [
		COLLECTIONS_CACHE_TAGS.LIST,
		COLLECTIONS_CACHE_TAGS.COUNTS,
		COLLECTIONS_CACHE_TAGS.DETAIL(collectionSlug),
		COLLECTIONS_CACHE_TAGS.PRODUCTS(collectionSlug),
		SHARED_CACHE_TAGS.PRODUCTS_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];
}
