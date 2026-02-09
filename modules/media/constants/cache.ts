/**
 * Cache configuration for Medias module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const MEDIAS_CACHE_TAGS = {
	/** Product media list */
	PRODUCT_GALLERY: (productId: string) => `product-${productId}-gallery`,

	/** Media for a specific SKU */
	SKU_MEDIA: (skuId: string) => `sku-${skuId}-media`,

	/** Lightbox slides (derived data) */
	LIGHTBOX_SLIDES: "lightbox-slides",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configures cache for a product gallery.
 * - Used for: /creations/[slug] gallery
 * - Duration: 15min fresh, 5min revalidation, 6h expiration
 */
export function cacheProductGallery(productId: string) {
	cacheLife("productDetail")
	cacheTag(MEDIAS_CACHE_TAGS.PRODUCT_GALLERY(productId))
}

/**
 * Configures cache for a SKU's media
 */
export function cacheSkuMedia(skuId: string) {
	cacheLife("productDetail")
	cacheTag(MEDIAS_CACHE_TAGS.SKU_MEDIA(skuId))
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags to invalidate when modifying a product's media
 */
export function getProductGalleryInvalidationTags(productId: string): string[] {
	return [MEDIAS_CACHE_TAGS.PRODUCT_GALLERY(productId)]
}

/**
 * Tags to invalidate when modifying a SKU's media
 */
export function getSkuMediaInvalidationTags(skuId: string, productId?: string): string[] {
	const tags = [MEDIAS_CACHE_TAGS.SKU_MEDIA(skuId)]

	if (productId) {
		tags.push(MEDIAS_CACHE_TAGS.PRODUCT_GALLERY(productId))
	}

	return tags
}
