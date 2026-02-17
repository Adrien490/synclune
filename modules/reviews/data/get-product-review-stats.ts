import { prisma } from "@/shared/lib/prisma"
import { cacheProductReviewStats } from "../constants/cache"
import { REVIEW_STATS_SELECT } from "../constants/review.constants"
import type { ReviewStats, ProductReviewStatistics } from "../types/review.types"
import { formatReviewStats } from "../services/review-stats.service"

/**
 * Récupère les statistiques brutes d'un produit
 *
 * @param productId - ID du produit
 * @returns Statistiques brutes ou null si inexistantes
 */
export async function getProductReviewStatsRaw(
	productId: string
): Promise<ReviewStats | null> {
	"use cache"
	cacheProductReviewStats(productId)

	const stats = await prisma.productReviewStats.findUnique({
		where: { productId },
		select: REVIEW_STATS_SELECT,
	})

	if (!stats) return null

	// Convert Prisma Decimal to number for cache serialization
	return {
		...stats,
		averageRating:
			typeof stats.averageRating === "number"
				? stats.averageRating
				: stats.averageRating.toNumber(),
	}
}

/**
 * Récupère les statistiques formatées d'un produit
 * Prêtes à l'emploi pour l'affichage UI
 *
 * @param productId - ID du produit
 * @returns Statistiques formatées avec distribution
 */
export async function getProductReviewStats(
	productId: string
): Promise<ProductReviewStatistics> {
	const stats = await getProductReviewStatsRaw(productId)
	return formatReviewStats(stats)
}

/**
 * Vérifie si un produit a des avis
 * Delegates to getProductReviewStatsRaw to avoid redundant cache entries
 *
 * @param productId - ID du produit
 * @returns true si le produit a au moins un avis publié
 */
export async function hasProductReviews(productId: string): Promise<boolean> {
	const stats = await getProductReviewStatsRaw(productId)
	return (stats?.totalCount ?? 0) > 0
}
