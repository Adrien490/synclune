/**
 * Tags de cache pour le module Colors
 *
 * Fonctions: voir utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const COLORS_CACHE_TAGS = {
	/** Liste des couleurs */
	LIST: "colors",
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheColors,
	getColorInvalidationTags,
} from "../utils/cache.utils";
