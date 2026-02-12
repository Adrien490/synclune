/**
 * Tags de cache pour le module Products
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE PROFILES (definis dans next.config.ts)
// ============================================
// - products:        stale=15min, revalidate=5min, expire=6h   (listes produits)
// - productDetail:   stale=15min, revalidate=5min, expire=6h   (detail produit/SKU)
// - reference:       stale=7j, revalidate=24h, expire=30j      (prix max, donnees stables)
// - dashboard:       stale=1min, revalidate=30s, expire=5min   (compteurs admin)
// - relatedProducts: stale=30min, revalidate=10min, expire=3h  (produits similaires)
// - skuStock:        stale=30s, revalidate=15s, expire=1min    (stock temps reel)

// ============================================
// CACHE TAGS
// ============================================

export const PRODUCTS_CACHE_TAGS = {
	/** Liste complète des produits */
	LIST: "products-list",

	/** Détail d'un produit spécifique */
	DETAIL: (slug: string) => `product-${slug}`,

	/** SKUs d'un produit */
	SKUS: (productId: string) => `product-${productId}-skus`,

	/** Prix maximum des produits (pour filtres) */
	MAX_PRICE: "max-product-price",

	/** Compteurs de produits par statut (dashboard) */
	COUNTS: "product-counts",

	/** Liste globale des SKUs */
	SKUS_LIST: "skus-list",

	/** Détail d'un SKU spécifique */
	SKU_DETAIL: (sku: string) => `sku-${sku}`,

	/** Stock temps réel d'un SKU (invalidé après achat/mise à jour stock) */
	SKU_STOCK: (skuId: string) => `sku-stock-${skuId}`,

	/** Produits similaires publics (visiteurs non authentifiés) */
	RELATED_PUBLIC: "related-products-public",

	/** Produits similaires personnalisés par utilisateur */
	RELATED_USER: (userId: string) => `related-products-user-${userId}`,

	/** Produits similaires contextuels par produit */
	RELATED_CONTEXTUAL: (productSlug: string) => `related-products-contextual-${productSlug}`,
} as const

/**
 * Cache tags pour les produits recemment vus
 */
export const RECENT_PRODUCTS_CACHE_TAGS = {
	/** Tag principal pour les produits recemment vus */
	LIST: "recent-products-list",
} as const

/**
 * Retourne les tags a invalider pour les produits recemment vus
 */
export function getRecentProductsInvalidationTags(): string[] {
	return [RECENT_PRODUCTS_CACHE_TAGS.LIST]
}

/**
 * Cache tags pour les recherches recentes
 */
export const RECENT_SEARCHES_CACHE_TAGS = {
	/** Tag principal pour les recherches recentes */
	LIST: "recent-searches-list",
} as const

/**
 * Retourne les tags a invalider pour les recherches recentes
 */
export function getRecentSearchesInvalidationTags(): string[] {
	return [RECENT_SEARCHES_CACHE_TAGS.LIST]
}

