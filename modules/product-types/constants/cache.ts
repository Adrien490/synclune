/**
 * Tags de cache pour le module Product Types
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const PRODUCT_TYPES_CACHE_TAGS = {
	/** Liste des types de produits */
	LIST: "product-types",
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheProductTypes,
	getProductTypeInvalidationTags,
} from "../utils/cache.utils";
