/**
 * Cache configuration for SKUs module
 *
 * Note: Ce module utilise PRODUCTS_CACHE_TAGS car les SKUs sont liés aux produits.
 * Fonctions: voir utils/cache.utils.ts
 */

// Re-exports pour retrocompatibilite
export {
	cacheProductSkus,
	cacheSkuDetail,
	getSkuInvalidationTags,
	getInventoryInvalidationTags,
	collectBulkInvalidationTags,
	invalidateTags,
	type SkuDataForInvalidation,
} from "../utils/cache.utils";
