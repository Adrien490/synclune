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

	const result = await prisma.productReviewStats.aggregate({
		_sum: {
			totalCount: true,
		},
		_avg: {
			averageRating: true,
		},
		where: {
			totalCount: {
				gt: 0,
			},
		},
	});

	const totalReviews = result._sum.totalCount ?? 0;
	const averageRating = result._avg.averageRating
		? Number(result._avg.averageRating)
		: 0;

	return {
		totalReviews,
		averageRating: Math.round(averageRating * 100) / 100, // Arrondi à 2 décimales
	};
}
