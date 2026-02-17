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
	/** Detail d'une couleur par slug */
	DETAIL: (slug: string) => `color-${slug}` as const,
} as const;

// Re-exports pour retrocompatibilite
export {
	cacheColors,
	cacheColorDetail,
	getColorInvalidationTags,
} from "../utils/cache.utils";
