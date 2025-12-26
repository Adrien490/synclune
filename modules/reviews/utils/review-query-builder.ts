import type { Prisma } from "@/app/generated/prisma/client"
import { notDeleted } from "@/shared/lib/prisma"
import { parseSortField, hasSortByInput } from "@/shared/utils/sort-field-parser"

import type { GetReviewsParams } from "../types/review.types"

// Re-export pour rétrocompatibilité
export { parseSortField, hasSortByInput }

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construit la clause orderBy Prisma à partir du sortBy string
 *
 * @example
 * buildReviewOrderBy("createdAt-desc") // { createdAt: "desc" }
 * buildReviewOrderBy("rating-asc") // { rating: "asc" }
 */
export function buildReviewOrderBy(sortBy: string): Prisma.ProductReviewOrderByWithRelationInput {
	const { field, direction } = parseSortField(sortBy)
	return { [field]: direction }
}

/**
 * Construit la clause WHERE selon le contexte (admin/storefront) et les paramètres
 *
 * Contexte storefront : uniquement les avis publiés
 * Contexte admin : tous les filtres avancés disponibles
 */
export function buildReviewWhereClause(
	params: GetReviewsParams,
	isAdminContext: boolean
): Prisma.ProductReviewWhereInput {
	const where: Prisma.ProductReviewWhereInput = {
		...notDeleted,
	}

	// Filtres communs
	if (params.productId) {
		where.productId = params.productId
	}

	if (params.filterRating) {
		where.rating = params.filterRating
	}

	// Contexte storefront : uniquement les avis publiés
	if (!isAdminContext) {
		where.status = "PUBLISHED"
		return where
	}

	// Contexte admin : filtres avancés
	if (params.status) {
		where.status = params.status
	}

	if (params.userId) {
		where.userId = params.userId
	}

	if (params.hasResponse !== undefined) {
		if (params.hasResponse) {
			where.response = { isNot: null }
		} else {
			where.response = null
		}
	}

	if (params.dateFrom || params.dateTo) {
		where.createdAt = {}
		if (params.dateFrom) {
			where.createdAt.gte = params.dateFrom
		}
		if (params.dateTo) {
			where.createdAt.lte = params.dateTo
		}
	}

	// Recherche textuelle
	if (params.search && params.search.trim()) {
		const searchTerm = params.search.trim()
		where.OR = [
			{ title: { contains: searchTerm, mode: "insensitive" } },
			{ content: { contains: searchTerm, mode: "insensitive" } },
			{ user: { name: { contains: searchTerm, mode: "insensitive" } } },
			{ user: { email: { contains: searchTerm, mode: "insensitive" } } },
			{ product: { title: { contains: searchTerm, mode: "insensitive" } } },
		]
	}

	return where
}
