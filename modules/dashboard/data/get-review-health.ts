import * as Sentry from "@sentry/nextjs";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";

import type { GetReviewHealthReturn } from "../types/dashboard.types";

export type { GetReviewHealthReturn } from "../types/dashboard.types";

/**
 * Fetch des stats globales d'avis pour le dashboard.
 *
 * Profil cache `reference` (24h) car la note moyenne ne change qu'à la
 * publication d'un nouvel avis — flow lent. Tag `REVIEWS_CACHE_TAGS.GLOBAL_STATS`
 * permet l'invalidation explicite via `getReviewInvalidationTags`.
 */
export async function fetchDashboardReviewHealth(): Promise<GetReviewHealthReturn> {
	"use cache";

	cacheLife("reference");
	cacheTag(DASHBOARD_CACHE_TAGS.REVIEW_HEALTH);
	cacheTag(REVIEWS_CACHE_TAGS.GLOBAL_STATS);

	return Sentry.startSpan({ name: "dashboard.fetchReviewHealth", op: "db.read" }, async () => {
		const stats = await prisma.productReviewStats.aggregate({
			_avg: { averageRating: true },
			_sum: { totalCount: true },
		});

		return {
			averageRating: Number(stats._avg.averageRating ?? 0),
			totalReviews: stats._sum.totalCount ?? 0,
		};
	});
}
