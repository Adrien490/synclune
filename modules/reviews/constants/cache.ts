/**
 * Cache configuration for Reviews module
 */

import { cacheLife, cacheTag } from "next/cache";

import {
	PRODUCTS_CACHE_TAGS,
	RECENT_PRODUCTS_CACHE_TAGS,
} from "@/modules/products/constants/cache";

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
	cacheLife("catalog");
	cacheTag(REVIEWS_CACHE_TAGS.PRODUCT(productId));
}

/**
 * Configure le cache pour les statistiques d'un produit
 * - Utilisé pour : Note moyenne, distribution des notes
 * - Durée : Cache moyen (products)
 */
export function cacheProductReviewStats(productId: string) {
	cacheLife("catalog");
	cacheTag(REVIEWS_CACHE_TAGS.STATS(productId));
}

/**
 * Configure le cache pour les produits à évaluer
 * - Utilisé pour : Section "Donnez votre avis" dans espace client
 * - Durée : Cache privé court
 */
export function cacheReviewableProducts(userId: string) {
	cacheLife("user");
	cacheTag(REVIEWS_CACHE_TAGS.REVIEWABLE(userId));
}

/**
 * Configure le cache pour la liste admin
 * - Utilisé pour : /admin/marketing/avis
 * - Durée : Cache court (dashboard)
 */
export function cacheReviewsAdmin() {
	cacheLife("user");
	cacheTag(REVIEWS_CACHE_TAGS.ADMIN_LIST);
}

/**
 * Configure le cache pour les avis homepage (social proof)
 * - Utilisé pour : Section "Avis clients" sur la homepage
 * - Durée : Cache moyen (products)
 */
export function cacheHomepageReviews() {
	cacheLife("catalog");
	cacheTag(REVIEWS_CACHE_TAGS.HOMEPAGE);
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
		// La note moyenne + le compteur d'avis sont joints (reviewStats) dans les
		// product cards, cachées sous des tags produit distincts. Sans ces purges,
		// les cards affichent une note périmée jusqu'à expiration (~6h). Cf. REVIEW-AUDIT-001.
		tags.push(...getProductListingReviewTags());
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
		// Idem création/suppression : la modération change la note affichée dans les
		// product cards (reviewStats joint). Cf. REVIEW-AUDIT-001.
		tags.push(...getProductListingReviewTags());
	}

	return tags;
}

/**
 * Tags des listings produits qui embarquent `reviewStats` (note + compteur) et
 * doivent donc être purgés quand une note de produit change.
 *
 * Note : `related-products-user-${id}` et `related-products-contextual-${slug}`
 * sont paramétrés (non énumérables ici) — leur fraîcheur (profil relatedProducts,
 * ~3h) est acceptée. On couvre les surfaces publiques globales.
 */
function getProductListingReviewTags(): string[] {
	return [
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.RELATED_PUBLIC,
		RECENT_PRODUCTS_CACHE_TAGS.LIST,
	];
}
