import { isAdmin } from "@/modules/auth/utils/guards"
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination"
import { prisma, notDeleted } from "@/shared/lib/prisma"

import {
	GET_REVIEWS_ADMIN_FALLBACK_SORT_BY,
	GET_REVIEWS_DEFAULT_PER_PAGE,
	GET_REVIEWS_DEFAULT_SORT_BY,
	GET_REVIEWS_MAX_PER_PAGE,
	GET_REVIEWS_SORT_FIELDS,
	REVIEW_ADMIN_SELECT,
	REVIEW_PUBLIC_SELECT,
	REVIEW_SORT_FIELD_LABELS,
} from "../constants/review.constants"
import { cacheProductReviews, cacheReviewsAdmin } from "../constants/cache"
import type {
	GetReviewsParams,
	GetReviewsReturn,
	ReviewAdmin,
	ReviewPublic,
	ReviewSortField,
} from "../types/review.types"
import {
	hasSortByInput,
	buildReviewOrderBy,
	buildReviewWhereClause,
} from "../services/review-query-builder"

// Re-export pour compatibilité
export {
	GET_REVIEWS_DEFAULT_PER_PAGE,
	GET_REVIEWS_DEFAULT_SORT_BY,
	GET_REVIEWS_MAX_PER_PAGE,
	GET_REVIEWS_SORT_FIELDS,
	REVIEW_SORT_FIELD_LABELS,
} from "../constants/review.constants"
export type {
	GetReviewsParams,
	GetReviewsReturn,
	ReviewAdmin,
	ReviewPublic,
	ReviewSortField,
} from "../types/review.types"

// ============================================================================
// TYPES INTERNES
// ============================================================================

type Review = ReviewPublic | ReviewAdmin

interface FetchReviewsContext {
	isAdminContext: boolean
	productId?: string
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère la liste des avis avec pagination cursor et filtrage
 * Gère automatiquement le contexte admin/storefront
 *
 * @param params - Paramètres de recherche et filtrage
 * @param options - Options (isAdmin pour forcer le contexte)
 */
export async function getReviews(
	params: GetReviewsParams,
	options?: { isAdmin?: boolean }
): Promise<GetReviewsReturn> {
	const admin = options?.isAdmin ?? (await isAdmin())

	// Admin: utiliser le tri par défaut admin si aucun tri explicite fourni
	if (admin && !hasSortByInput(params?.sortBy)) {
		params = { ...params, sortBy: GET_REVIEWS_ADMIN_FALLBACK_SORT_BY as ReviewSortField }
	}

	return fetchReviews(params, { isAdminContext: admin, productId: params.productId })
}

/**
 * Récupère les avis avec cache
 * Fonction interne avec "use cache"
 */
async function fetchReviews(
	params: GetReviewsParams,
	context: FetchReviewsContext
): Promise<GetReviewsReturn> {
	"use cache"

	// Cache selon le contexte
	if (context.isAdminContext) {
		cacheReviewsAdmin()
	} else if (context.productId) {
		cacheProductReviews(context.productId)
	}

	try {
		const where = buildReviewWhereClause(params, context.isAdminContext)
		const select = context.isAdminContext ? REVIEW_ADMIN_SELECT : REVIEW_PUBLIC_SELECT
		const orderBy = buildReviewOrderBy(params.sortBy || GET_REVIEWS_DEFAULT_SORT_BY)

		// Limiter le nombre par page
		const perPage = Math.min(
			Math.max(1, params.perPage || GET_REVIEWS_DEFAULT_PER_PAGE),
			GET_REVIEWS_MAX_PER_PAGE
		)

		// Compter le total
		const totalCount = await prisma.productReview.count({ where })

		// Construire la pagination cursor avec le helper centralisé
		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take: perPage,
		})

		// Récupérer les avis avec pagination cursor
		const reviews = (await prisma.productReview.findMany({
			where,
			select,
			orderBy,
			...cursorConfig,
		})) as Review[]

		// Traiter les résultats avec le helper centralisé
		const { items, pagination } = processCursorResults(
			reviews,
			perPage,
			params.direction,
			params.cursor
		)

		return {
			reviews: items,
			pagination,
			totalCount,
		}
	} catch (error) {
		console.error("[GET_REVIEWS]", error)
		return {
			reviews: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		}
	}
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Récupère tous les avis publiés d'un produit (sans pagination)
 * Conservé pour compatibilité
 */
export async function getAllProductReviews(productId: string): Promise<ReviewPublic[]> {
	"use cache"
	cacheProductReviews(productId)

	return prisma.productReview.findMany({
		where: {
			productId,
			status: "PUBLISHED",
			...notDeleted,
		},
		select: REVIEW_PUBLIC_SELECT,
		orderBy: { createdAt: "desc" },
	}) as Promise<ReviewPublic[]>
}

/**
 * Récupère le nombre d'avis par statut pour les badges admin
 */
export async function getReviewCountsByStatus(): Promise<{
	published: number
	hidden: number
	total: number
}> {
	"use cache"
	cacheReviewsAdmin()

	const counts = await prisma.productReview.groupBy({
		by: ["status"],
		where: notDeleted,
		_count: { status: true },
	})

	const published = counts.find((c) => c.status === "PUBLISHED")?._count.status || 0
	const hidden = counts.find((c) => c.status === "HIDDEN")?._count.status || 0

	return {
		published,
		hidden,
		total: published + hidden,
	}
}
