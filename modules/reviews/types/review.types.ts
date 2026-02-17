import type { ReviewStatus } from "@/app/generated/prisma/client"

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Avis pour affichage public (storefront)
 */
export interface ReviewPublic {
	id: string
	rating: number
	title: string | null
	content: string
	createdAt: Date
	user: {
		name: string | null
		image: string | null
	}
	medias: Array<{
		id: string
		url: string
		blurDataUrl: string | null
		altText: string | null
	}>
	response: {
		content: string
		authorName: string
		createdAt: Date
	} | null
}

/**
 * Avis pour la section homepage (social proof)
 */
export interface ReviewHomepage extends ReviewPublic {
	product: {
		title: string
		slug: string
		skus: Array<{
			images: Array<{
				url: string
				blurDataUrl: string | null
				altText: string | null
			}>
		}>
	}
}

/**
 * Avis pour la liste admin
 */
export interface ReviewAdmin {
	id: string
	rating: number
	title: string | null
	content: string
	status: ReviewStatus
	createdAt: Date
	updatedAt: Date
	user: {
		id: string
		name: string | null
		email: string
		image: string | null
	}
	product: {
		id: string
		title: string
		slug: string
	}
	medias: Array<{
		id: string
		url: string
		blurDataUrl: string | null
		altText: string | null
	}>
	response: {
		id: string
		content: string
		authorId: string
		authorName: string
		createdAt: Date
		updatedAt: Date
	} | null
}

/**
 * Avis pour l'espace client (mes avis)
 */
export interface ReviewUser {
	id: string
	rating: number
	title: string | null
	content: string
	status: ReviewStatus
	createdAt: Date
	updatedAt: Date
	product: {
		id: string
		title: string
		slug: string
		skus: Array<{
			images: Array<{
				url: string
				blurDataUrl: string | null
				altText: string | null
			}>
		}>
	}
	medias: Array<{
		id: string
		url: string
		blurDataUrl: string | null
		altText: string | null
	}>
	response: {
		content: string
		authorName: string
		createdAt: Date
	} | null
}

/**
 * Statistiques agrégées d'un produit
 * Note: averageRating is already converted from Prisma Decimal to number
 * in getProductReviewStatsRaw for cache serialization
 */
export interface ReviewStats {
	totalCount: number
	averageRating: number
	rating1Count: number
	rating2Count: number
	rating3Count: number
	rating4Count: number
	rating5Count: number
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Options de tri
 */
export type ReviewSortBy = "createdAt" | "rating" | "updatedAt"
export type ReviewSortOrder = "asc" | "desc"
export type ReviewStorefrontSort = "recent" | "oldest" | "highest-rating" | "lowest-rating"

/**
 * Champs de tri unifiés (pattern get-products.ts)
 */
export type ReviewSortField =
	| "createdAt-desc"
	| "createdAt-asc"
	| "rating-desc"
	| "rating-asc"
	| "updatedAt-desc"
	| "updatedAt-asc"

/**
 * Paramètres unifiés pour récupérer les avis (pattern get-products.ts)
 */
export interface GetReviewsParams {
	// Pagination cursor
	cursor?: string
	perPage?: number
	direction?: "forward" | "backward"
	sortBy?: ReviewSortField

	// Filtres communs
	productId?: string
	filterRating?: number

	// Filtres admin (ignorés si !isAdmin)
	status?: ReviewStatus
	userId?: string
	hasResponse?: boolean
	search?: string
	dateFrom?: Date
	dateTo?: Date
}

/**
 * Résultat unifié avec pagination cursor (pattern get-products.ts)
 */
export interface GetReviewsReturn {
	reviews: ReviewPublic[] | ReviewAdmin[]
	pagination: {
		nextCursor: string | null
		prevCursor: string | null
		hasNextPage: boolean
		hasPreviousPage: boolean
	}
	totalCount: number
}

// ============================================================================
// ELIGIBILITY TYPES
// ============================================================================

/**
 * Résultat de la vérification d'éligibilité pour laisser un avis
 */
export interface CanReviewResult {
	canReview: boolean
	orderItemId: string | null
	reason?: "already_reviewed" | "no_purchase" | "order_not_delivered"
	existingReviewId?: string
}

/**
 * Produit que l'utilisateur peut évaluer
 */
export interface ReviewableProduct {
	productId: string
	productTitle: string
	productSlug: string
	productImage: {
		url: string
		blurDataUrl: string | null
		altText: string | null
	} | null
	orderItemId: string
	orderedAt: Date
	deliveredAt: Date | null
}

// ============================================================================
// REVIEW MEDIA TYPES
// ============================================================================

/**
 * Média d'un avis (photo)
 */
export interface ReviewMedia {
	id: string
	url: string
	blurDataUrl: string | null
	altText: string | null
}

// ============================================================================
// REVIEW RESPONSE TYPES
// ============================================================================

/**
 * Réponse admin à un avis (affichage)
 */
export interface ReviewResponseDisplay {
	content: string
	authorName: string
	createdAt: Date
}

/**
 * Réponse admin complète (admin)
 */
export interface ReviewResponseAdmin {
	id: string
	content: string
	authorId: string
	authorName: string
	createdAt: Date
	updatedAt: Date
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Statistiques globales d'avis pour tout le site
 * Utilisé pour l'AggregateRating dans le schema LocalBusiness
 */
export interface GlobalReviewStats {
	totalReviews: number
	averageRating: number
}

/**
 * Distribution des notes pour le graphique
 */
export interface RatingDistribution {
	rating: number
	count: number
	percentage: number
}

/**
 * Statistiques complètes d'un produit (pour UI)
 */
export interface ProductReviewStatistics {
	totalCount: number
	averageRating: number
	distribution: RatingDistribution[]
}
