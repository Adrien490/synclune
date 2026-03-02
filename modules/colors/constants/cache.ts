/**
 * Cache tags for the Colors module
 *
 * Functions: see utils/cache.utils.ts
 */

// ============================================
// CACHE TAGS
// ============================================

export const COLORS_CACHE_TAGS = {
	/** Colors list */
	LIST: "colors-list",
	/** Single color detail by slug */
	DETAIL: (slug: string) => `color-${slug}` as const,
} as const;

// Re-exports for convenience
export { cacheColors, cacheColorDetail, getColorInvalidationTags } from "../utils/cache.utils";
