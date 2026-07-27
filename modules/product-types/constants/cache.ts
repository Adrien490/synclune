/**
 * Tags de cache pour le module Product Types
 *
 * Fonctions: voir utils/cache.utils.ts
 */

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE TAGS
// ============================================

export const PRODUCT_TYPES_CACHE_TAGS = {
	/** Liste des types de produits (source of truth: SHARED_CACHE_TAGS.PRODUCT_TYPES_LIST) */
	LIST: SHARED_CACHE_TAGS.PRODUCT_TYPES_LIST,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheProductTypesList,
	cacheProductTypesPublic,
	cacheProductTypeDetail,
	cacheProductTypeCounts,
} from "../utils/cache.utils";
