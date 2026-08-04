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
 * - Profil `reference` (cf. next.config.ts pour les durées — ne pas les recopier ici,
 *   ce commentaire annonçait « 1h / 15min / 24h » alors que le profil vaut 7j/24h/30j.
 *   Le helper frère `cacheCollectionDetail` avait reçu ce correctif, pas celui-ci.)
 */
export function cacheCollections() {
	cacheLife("reference");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour une collection et ses produits
 * - Utilisé pour : /collections/[slug]
 * - Profil `reference` (cf. next.config.ts pour les durées — ne pas les recopier ici,
 *   ce commentaire annonçait « 1h / 15min / 24h » alors que le profil vaut 7j/24h/30j)
 */
export function cacheCollectionDetail(slug: string) {
	cacheLife("reference");
	cacheTag(
		COLLECTIONS_CACHE_TAGS.DETAIL(slug),
		COLLECTIONS_CACHE_TAGS.PRODUCTS(slug),
		COLLECTIONS_CACHE_TAGS.LIST,
	);
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
 *
 * `LIST` couvre aussi le mega-menu de la navbar : `getNavbarMenuData` n'a plus
 * de scope cache propre (ex-tag `NAVBAR_MENU`, déposé — CACHE-DEGRADED-VALUE-001),
 * il lit l'entrée `collections-list` de `fetchCollections` directement.
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
