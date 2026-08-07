/**
 * Tags de cache pour le module Collections
 *
 * Fonctions de cache: voir utils/cache.utils.ts
 */

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE TAGS
// ============================================

export const COLLECTIONS_CACHE_TAGS = {
	/**
	 * Liste de toutes les collections (source of truth: SHARED_CACHE_TAGS.COLLECTIONS_LIST)
	 *
	 * ⚠️ Était un littéral `"collections-list"` DUPLIQUÉ jusqu'au 2026-08-07, alors que
	 * ses deux jumeaux partagés (`PRODUCTS_LIST`, `PRODUCT_TYPES_LIST`) aliasaient déjà
	 * la SSOT. Même valeur, donc aucun bug — mais deux sources pour un seul tag :
	 * renommer côté `shared/` cassait la cascade en silence (les mutations produit
	 * invalident `SHARED_CACHE_TAGS.COLLECTIONS_LIST`, cf. `products/utils/cache.utils`).
	 */
	LIST: SHARED_CACHE_TAGS.COLLECTIONS_LIST,

	/** Compteurs par statut */
	COUNTS: "collection-counts",

	/** Détail d'une collection spécifique */
	DETAIL: (slug: string) => `collection-${slug}`,

	/** Produits d'une collection */
	PRODUCTS: (slug: string) => `collection-${slug}-products`,
} as const;
