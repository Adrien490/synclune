/**
 * Cache helpers for the Colors module
 *
 * Constants: see constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { COLORS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure cache for the colors list
 * - Used by: filter selectors, admin forms
 */
export function cacheColors() {
	cacheLife("reference");
	cacheTag(COLORS_CACHE_TAGS.LIST);
}

/**
 * Configure cache for a specific color detail page
 */
export function cacheColorDetail(slug: string) {
	cacheLife("reference");
	cacheTag(COLORS_CACHE_TAGS.DETAIL(slug), COLORS_CACHE_TAGS.LIST);
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags to invalidate when a color is modified.
 *
 * Automatically invalidates:
 * - The colors list
 * - The color detail (if slug provided)
 * - The admin sidebar badges
 *
 * @param slug - Slug of the modified color (optional)
 */
export function getColorInvalidationTags(slug?: string): string[] {
	const tags: string[] = [COLORS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];
	if (slug) {
		tags.push(COLORS_CACHE_TAGS.DETAIL(slug));
	}
	return tags;
}
