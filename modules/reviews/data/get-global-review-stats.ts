import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";

export type GlobalReviewStats = {
	totalReviews: number;
	averageRating: number;
};

/**
 * Récupère les statistiques globales d'avis pour tout le site
 * Utilisé pour l'AggregateRating dans le schema LocalBusiness
 *
 * @returns Statistiques globales (moyenne pondérée et nombre total d'avis)
 */
export async function getGlobalReviewStats(): Promise<GlobalReviewStats> {
	"use cache";
	cacheLife("reference");
	cacheTag("global-review-stats");

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
