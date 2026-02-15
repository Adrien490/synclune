import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { REVIEWS_CACHE_TAGS } from "../constants/cache";
import type { GlobalReviewStats } from "../types/review.types";

// Re-export pour compatibilité
export type { GlobalReviewStats };

/**
 * Récupère les statistiques globales d'avis pour tout le site
 * Utilisé pour l'AggregateRating dans le schema LocalBusiness
 *
 * @returns Statistiques globales (moyenne pondérée et nombre total d'avis)
 */
export async function getGlobalReviewStats(): Promise<GlobalReviewStats> {
	"use cache";
	cacheLife("reference");
	cacheTag(REVIEWS_CACHE_TAGS.GLOBAL_STATS);

	// Weighted average: SUM(averageRating * totalCount) / SUM(totalCount)
	// Avoids the "average of averages" bias from _avg.averageRating
	const [result] = await prisma.$queryRaw<
		[{ total_reviews: bigint; weighted_avg: number | null }]
	>`
		SELECT
			COALESCE(SUM("totalCount"), 0) AS total_reviews,
			CASE
				WHEN SUM("totalCount") > 0
				THEN SUM("averageRating" * "totalCount") / SUM("totalCount")
				ELSE 0
			END AS weighted_avg
		FROM "ProductReviewStats"
		WHERE "totalCount" > 0
	`;

	const totalReviews = Number(result.total_reviews);
	const averageRating = result.weighted_avg ? Number(result.weighted_avg) : 0;

	return {
		totalReviews,
		averageRating: Math.round(averageRating * 100) / 100,
	};
}
