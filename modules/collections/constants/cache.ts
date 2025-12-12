/**
 * Tags de cache pour le module Collections
 *
 * Fonctions de cache: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const COLLECTIONS_CACHE_TAGS = {
	/** Liste de toutes les collections */
	LIST: "collections-list",

	/** Compteurs par statut */
	COUNTS: "collection-counts",

	/** Détail d'une collection spécifique */
	DETAIL: (slug: string) => `collection-${slug}`,

	/** Produits d'une collection */
	PRODUCTS: (slug: string) => `collection-${slug}-products`,
} as const;
