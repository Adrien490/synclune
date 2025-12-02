/**
 * Cache configuration for Medias module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const MEDIAS_CACHE_TAGS = {
	/** Liste des médias d'un produit */
	PRODUCT_GALLERY: (productId: string) => `product-${productId}-gallery`,

	/** Médias d'un SKU spécifique */
	SKU_MEDIA: (skuId: string) => `sku-${skuId}-media`,

	/** Slides lightbox (données dérivées) */
	LIGHTBOX_SLIDES: "lightbox-slides",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la galerie d'un produit
 * - Utilisé pour : /creations/[slug] galerie
 * - Durée : 15min fraîche, 5min revalidation, 6h expiration
 */
export function cacheProductGallery(productId: string) {
	cacheLife("productDetail")
	cacheTag(MEDIAS_CACHE_TAGS.PRODUCT_GALLERY(productId))
}

/**
 * Configure le cache pour les médias d'un SKU
 */
export function cacheSkuMedia(skuId: string) {
	cacheLife("productDetail")
	cacheTag(MEDIAS_CACHE_TAGS.SKU_MEDIA(skuId))
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification des médias d'un produit
 */
export function getProductGalleryInvalidationTags(productId: string): string[] {
	return [MEDIAS_CACHE_TAGS.PRODUCT_GALLERY(productId)]
}

/**
 * Tags à invalider lors de la modification des médias d'un SKU
 */
export function getSkuMediaInvalidationTags(skuId: string, productId?: string): string[] {
	const tags = [MEDIAS_CACHE_TAGS.SKU_MEDIA(skuId)]

	if (productId) {
		tags.push(MEDIAS_CACHE_TAGS.PRODUCT_GALLERY(productId))
	}

	return tags
}
