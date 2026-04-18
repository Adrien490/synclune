/**
 * Cache configuration for Reviews module
 */

import { cacheLife, cacheTag } from "next/cache";

// ============================================
// CACHE TAGS
// ============================================

export const REVIEWS_CACHE_TAGS = {
	/** Liste des avis publiés d'un produit (storefront) */
	PRODUCT: (productId: string) => `reviews-product-${productId}`,

	/** Statistiques agrégées d'un produit */
	STATS: (productId: string) => `reviews-stats-${productId}`,

	/** Statistiques globales (tous les avis du site) */
	GLOBAL_STATS: "global-review-stats",

	/** Liste des avis d'un utilisateur (espace client) */
	USER: (userId: string) => `reviews-user-${userId}`,

	/** Produits que l'utilisateur peut évaluer */
	REVIEWABLE: (userId: string) => `reviewable-products-${userId}`,

	/** Détail d'un avis (public) */
	DETAIL: (reviewId: string) => `review-${reviewId}`,

	/** Détail d'un avis (admin - includes hidden reviews) */
	ADMIN_DETAIL: (reviewId: string) => `review-admin-${reviewId}`,

	/** Liste admin (tous les avis) */
	ADMIN_LIST: "reviews-admin-list",

	/** Avis mis en avant sur la homepage */
	HOMEPAGE: "homepage-reviews",

	/** Commande chargee pour l'envoi d'email de demande d'avis (cron + webhook) */
	ORDER_FOR_REQUEST: (orderId: string) => `review-request-order-${orderId}`,
} as const;

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les avis d'un produit (storefront)
 * - Utilisé pour : Page produit, section avis
 * - Durée : Cache moyen (products)
 */
export function cacheProductReviews(productId: string) {
	cacheLife("products");
	cacheTag(REVIEWS_CACHE_TAGS.PRODUCT(productId));
}

/**
 * Configure le cache pour les statistiques d'un produit
 * - Utilisé pour : Note moyenne, distribution des notes
 * - Durée : Cache moyen (products)
 */
export function cacheProductReviewStats(productId: string) {
	cacheLife("products");
	cacheTag(REVIEWS_CACHE_TAGS.STATS(productId));
}

/**
 * Configure le cache pour les produits à évaluer
 * - Utilisé pour : Section "Donnez votre avis" dans espace client
 * - Durée : Cache privé court
 */
export function cacheReviewableProducts(userId: string) {
	cacheLife("userOrders");
	cacheTag(REVIEWS_CACHE_TAGS.REVIEWABLE(userId));
}

/**
 * Configure le cache pour la liste admin
 * - Utilisé pour : /admin/marketing/avis
 * - Durée : Cache court (dashboard)
 */
export function cacheReviewsAdmin() {
	cacheLife("dashboard");
	cacheTag(REVIEWS_CACHE_TAGS.ADMIN_LIST);
}

/**
 * Configure le cache pour les avis homepage (social proof)
 * - Utilisé pour : Section "Avis clients" sur la homepage
 * - Durée : Cache moyen (products)
 */
export function cacheHomepageReviews() {
	cacheLife("products");
	cacheTag(REVIEWS_CACHE_TAGS.HOMEPAGE);
}

/**
 * Configure le cache pour le chargement d'une commande avant envoi d'email de demande d'avis
 * - Utilisé par : cron review-request-emails (daily), webhook order.delivered
 * - Profil "userOrders" : 2min stale, 1min revalidate, 10min expire
 */
export function cacheOrderForReviewRequest(orderId: string) {
	cacheLife("userOrders");
	cacheTag(REVIEWS_CACHE_TAGS.ORDER_FOR_REQUEST(orderId));
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la création/modification/suppression d'un avis
 * Note: productId peut être null si le produit a été archivé
 */
export function getReviewInvalidationTags(
	productId: string | null,
	userId: string,
	reviewId?: string,
): string[] {
	const tags: string[] = [
		REVIEWS_CACHE_TAGS.USER(userId),
		REVIEWS_CACHE_TAGS.REVIEWABLE(userId),
		REVIEWS_CACHE_TAGS.ADMIN_LIST,
		REVIEWS_CACHE_TAGS.HOMEPAGE,
		REVIEWS_CACHE_TAGS.GLOBAL_STATS,
	];

	// Ajouter les tags produit seulement si le produit existe encore
	if (productId) {
		tags.push(REVIEWS_CACHE_TAGS.PRODUCT(productId));
		tags.push(REVIEWS_CACHE_TAGS.STATS(productId));
	}

	if (reviewId) {
		tags.push(REVIEWS_CACHE_TAGS.DETAIL(reviewId));
		tags.push(REVIEWS_CACHE_TAGS.ADMIN_DETAIL(reviewId));
	}

	return tags;
}

/**
 * Tags à invalider lors de la modération admin (hide/unhide)
 * Ne touche pas le cache utilisateur
 * Note: productId peut être null si le produit a été archivé
 */
export function getReviewModerationTags(productId: string | null, reviewId: string): string[] {
	const tags = [
		REVIEWS_CACHE_TAGS.DETAIL(reviewId),
		REVIEWS_CACHE_TAGS.ADMIN_DETAIL(reviewId),
		REVIEWS_CACHE_TAGS.ADMIN_LIST,
		REVIEWS_CACHE_TAGS.HOMEPAGE,
		REVIEWS_CACHE_TAGS.GLOBAL_STATS,
	];

	// Ajouter les tags produit seulement si le produit existe encore
	if (productId) {
		tags.push(REVIEWS_CACHE_TAGS.PRODUCT(productId));
		tags.push(REVIEWS_CACHE_TAGS.STATS(productId));
	}

	return tags;
}
