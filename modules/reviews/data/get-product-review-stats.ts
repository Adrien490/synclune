import { prisma } from "@/shared/lib/prisma"
import { cacheProductReviewStats } from "../constants/cache"
import { REVIEW_STATS_SELECT } from "../constants/review.constants"
import type { ReviewStats, ProductReviewStatistics } from "../types/review.types"
import { formatReviewStats } from "../utils/stats.utils"

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

	return prisma.productReviewStats.findUnique({
		where: { productId },
		select: REVIEW_STATS_SELECT,
	})
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
 *
 * @param productId - ID du produit
 * @returns true si le produit a au moins un avis publié
 */
export async function hasProductReviews(productId: string): Promise<boolean> {
	"use cache"
	cacheProductReviewStats(productId)

	const stats = await prisma.productReviewStats.findUnique({
		where: { productId },
		select: { totalCount: true },
	})

	return (stats?.totalCount ?? 0) > 0
}
