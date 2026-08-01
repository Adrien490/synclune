/**
 * Cache helpers for the Colors module
 *
 * Constants: see constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { COLORS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure cache for the colors list.
 *
 * Used by both admin (sees inactive too) and storefront (filters by
 * `isActive: true` on the consumer side). Profile `reference` is fine because
 * every admin mutation invalidates `colors-list` via `getColorInvalidationTags`,
 * so the 24h revalidate window is never the source of stale data.
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

interface ColorInvalidationOptions {
	/** Slug of the modified color (current and/or previous if renamed). */
	slug?: string;
	/**
	 * Slugs of products that own a SKU referencing this color. When provided,
	 * cascade invalidates `products-list` + `product-${slug}` so storefront
	 * pages don't display a stale name/hex after a color update.
	 */
	affectedProductSlugs?: readonly string[];
}

/**
 * Tags to invalidate when a color is modified.
 *
 * Automatically invalidates:
 * - The colors list (`colors-list`)
 * - The color detail (if `slug` provided)
 * - The admin sidebar badges
 * - Affected product pages + the products list (if `affectedProductSlugs`
 *   provided) — the storefront product PDP embeds the color name/hex in the
 *   SKU swatch, so a rename would otherwise stay stale up to 15 min (catalog
 *   cache profile).
 *
 * @param input - either a single slug (legacy signature) or an options bag.
 */
export function getColorInvalidationTags(input?: string | ColorInvalidationOptions): string[] {
	const opts: ColorInvalidationOptions =
		typeof input === "string" ? { slug: input } : (input ?? {});

	const tags = new Set<string>([COLORS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES]);

	if (opts.slug) {
		tags.add(COLORS_CACHE_TAGS.DETAIL(opts.slug));
	}

	if (opts.affectedProductSlugs && opts.affectedProductSlugs.length > 0) {
		tags.add(SHARED_CACHE_TAGS.PRODUCTS_LIST);
		for (const productSlug of opts.affectedProductSlugs) {
			// SSOT plutôt que littéral : ce template ré-implémentait à la main la
			// valeur de PRODUCTS_CACHE_TAGS.DETAIL. Renommer le préfixe `product-`
			// aurait cassé la cascade couleur → PDP en silence (audit cache 2026-07-31).
			tags.add(PRODUCTS_CACHE_TAGS.DETAIL(productSlug));
		}
	}

	return Array.from(tags);
}
