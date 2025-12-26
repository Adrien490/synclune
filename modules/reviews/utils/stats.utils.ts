import type { PrismaTransaction } from "@/shared/types/prisma"
import type { ProductReviewStatistics, RatingDistribution } from "../types/review.types"
import type { ReviewStats } from "../types/review.types"
import { REVIEW_CONFIG } from "../constants/review.constants"

// Re-export des fonctions utilitaires depuis shared
export {
	calculateAverageRating,
	formatRating,
	getRatingLabel,
} from "@/shared/utils/rating-utils"

/**
 * Met à jour les statistiques agrégées des avis d'un produit
 * À appeler dans une transaction après création/modification/suppression d'un avis
 *
 * @param tx - Transaction Prisma
 * @param productId - ID du produit
 */
export async function updateProductReviewStats(
	tx: PrismaTransaction,
	productId: string
): Promise<void> {
	// Calculer les statistiques agrégées
	const stats = await tx.productReview.aggregate({
		where: {
			productId,
			status: "PUBLISHED",
			deletedAt: null,
		},
		_count: true,
		_avg: { rating: true },
	})

	// Calculer la distribution des notes
	const distribution = await tx.productReview.groupBy({
		by: ["rating"],
		where: {
			productId,
			status: "PUBLISHED",
			deletedAt: null,
		},
		_count: true,
	})

	// Transformer la distribution en objet
	const ratingCounts = {
		rating1Count: 0,
		rating2Count: 0,
		rating3Count: 0,
		rating4Count: 0,
		rating5Count: 0,
	}

	for (const item of distribution) {
		const key = `rating${item.rating}Count` as keyof typeof ratingCounts
		ratingCounts[key] = item._count
	}

	// Upsert les statistiques
	await tx.productReviewStats.upsert({
		where: { productId },
		create: {
			productId,
			totalCount: stats._count,
			averageRating: stats._avg.rating ?? 0,
			...ratingCounts,
		},
		update: {
			totalCount: stats._count,
			averageRating: stats._avg.rating ?? 0,
			...ratingCounts,
		},
	})
}

/**
 * Transforme les statistiques brutes en statistiques UI-friendly
 * avec distribution calculée en pourcentages
 *
 * @param stats - Statistiques brutes depuis la base de données
 * @returns Statistiques formatées pour l'UI
 */
export function formatReviewStats(stats: ReviewStats | null): ProductReviewStatistics {
	if (!stats || stats.totalCount === 0) {
		return {
			totalCount: 0,
			averageRating: 0,
			distribution: Array.from({ length: REVIEW_CONFIG.MAX_RATING }, (_, i) => ({
				rating: i + 1,
				count: 0,
				percentage: 0,
			})),
		}
	}

	const distribution: RatingDistribution[] = [
		{
			rating: 5,
			count: stats.rating5Count,
			percentage: Math.round((stats.rating5Count / stats.totalCount) * 100),
		},
		{
			rating: 4,
			count: stats.rating4Count,
			percentage: Math.round((stats.rating4Count / stats.totalCount) * 100),
		},
		{
			rating: 3,
			count: stats.rating3Count,
			percentage: Math.round((stats.rating3Count / stats.totalCount) * 100),
		},
		{
			rating: 2,
			count: stats.rating2Count,
			percentage: Math.round((stats.rating2Count / stats.totalCount) * 100),
		},
		{
			rating: 1,
			count: stats.rating1Count,
			percentage: Math.round((stats.rating1Count / stats.totalCount) * 100),
		},
	]

	return {
		totalCount: stats.totalCount,
		averageRating: stats.averageRating,
		distribution,
	}
}

