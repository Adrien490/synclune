/**
 * Cache configuration for Reviews module
 */

import { cacheLife, cacheTag } from "next/cache"
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache"

// ============================================
// CACHE TAGS
// ============================================

export const REVIEWS_CACHE_TAGS = {
	/** Liste des avis publiés d'un produit (storefront) */
	PRODUCT: (productId: string) => `reviews-product-${productId}`,

	/** Statistiques agrégées d'un produit */
	STATS: (productId: string) => `reviews-stats-${productId}`,

	/** Liste des avis d'un utilisateur (espace client) */
	USER: (userId: string) => `reviews-user-${userId}`,

	/** Produits que l'utilisateur peut évaluer */
	REVIEWABLE: (userId: string) => `reviewable-products-${userId}`,

	/** Détail d'un avis */
	DETAIL: (reviewId: string) => `review-${reviewId}`,

	/** Liste admin (tous les avis) */
	ADMIN_LIST: "reviews-admin-list",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les avis d'un produit (storefront)
 * - Utilisé pour : Page produit, section avis
 * - Durée : Cache moyen (products)
 */
export function cacheProductReviews(productId: string) {
	cacheLife("products")
	cacheTag(REVIEWS_CACHE_TAGS.PRODUCT(productId))
}

/**
 * Configure le cache pour les statistiques d'un produit
 * - Utilisé pour : Note moyenne, distribution des notes
 * - Durée : Cache moyen (products)
 */
export function cacheProductReviewStats(productId: string) {
	cacheLife("products")
	cacheTag(REVIEWS_CACHE_TAGS.STATS(productId))
}

/**
 * Configure le cache pour les avis d'un utilisateur (espace client)
 * - Utilisé pour : Page "Mes avis"
 * - Durée : Cache privé court
 */
export function cacheUserReviews(userId: string) {
	cacheLife("session")
	cacheTag(REVIEWS_CACHE_TAGS.USER(userId))
}

/**
 * Configure le cache pour les produits à évaluer
 * - Utilisé pour : Section "Donnez votre avis" dans espace client
 * - Durée : Cache privé court
 */
export function cacheReviewableProducts(userId: string) {
	cacheLife("session")
	cacheTag(REVIEWS_CACHE_TAGS.REVIEWABLE(userId))
}

/**
 * Configure le cache pour la liste admin
 * - Utilisé pour : /admin/marketing/avis
 * - Durée : Cache court (dashboard)
 */
export function cacheReviewsAdmin() {
	cacheLife("dashboard")
	cacheTag(REVIEWS_CACHE_TAGS.ADMIN_LIST)
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la création/modification/suppression d'un avis
 */
export function getReviewInvalidationTags(
	productId: string,
	userId: string,
	reviewId?: string
): string[] {
	const tags: string[] = [
		REVIEWS_CACHE_TAGS.PRODUCT(productId),
		REVIEWS_CACHE_TAGS.STATS(productId),
		REVIEWS_CACHE_TAGS.USER(userId),
		REVIEWS_CACHE_TAGS.REVIEWABLE(userId),
		REVIEWS_CACHE_TAGS.ADMIN_LIST,
		// Les avis impactent le tri par popularité
		PRODUCTS_CACHE_TAGS.POPULAR,
	]

	if (reviewId) {
		tags.push(REVIEWS_CACHE_TAGS.DETAIL(reviewId))
	}

	return tags
}

/**
 * Tags à invalider lors de la modération admin (hide/unhide)
 * Ne touche pas le cache utilisateur
 */
export function getReviewModerationTags(
	productId: string,
	reviewId: string
): string[] {
	return [
		REVIEWS_CACHE_TAGS.PRODUCT(productId),
		REVIEWS_CACHE_TAGS.STATS(productId),
		REVIEWS_CACHE_TAGS.DETAIL(reviewId),
		REVIEWS_CACHE_TAGS.ADMIN_LIST,
		// La modération impacte le tri par popularité
		PRODUCTS_CACHE_TAGS.POPULAR,
	]
}
