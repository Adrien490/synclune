/**
 * Tags de cache pour le module Products
 *
 * Fonctions: voir utils/cache.utils.ts
 */

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
	SKUS_LIST: "skus",

	/** Détail d'un SKU spécifique */
	SKU_DETAIL: (sku: string) => `sku-${sku}`,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheProducts,
	cacheProductDetail,
	cacheProductSkus,
	cacheSkuDetail,
	getProductInvalidationTags,
	getSkuInvalidationTags,
	getInventoryInvalidationTags,
} from "../utils/cache.utils";
