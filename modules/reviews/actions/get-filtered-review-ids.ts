"use server";

import { runCrossPageIdsAction } from "@/shared/lib/actions/run-cross-page-ids-action";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { BULK_REVIEW_ACTION_LIMIT } from "../constants/review.constants";
import { buildReviewWhereClause } from "../services/review-query-builder";
import type { GetReviewsParams } from "../types/review.types";

export interface FilteredReviewIdsData {
	ids: string[];
	totalCount: number;
	cappedAt: number;
}

/**
 * Hydrate uniquement les ids pour le banner "Sélectionner les N filtrés" sur la
 * page d'avis admin. Bypass `getReviews` (qui charge user+product+response) —
 * paye ~10 KB en chargeant `select: { id: true }` + un `count` exact.
 *
 * Note : appelé exclusivement en contexte admin (isAdminContext=true). Les
 * filtres avancés (status, hasResponse, dateFrom/dateTo, search) sont passés
 * à plat dans `params` — pas de wrapper `filters` (cohérent avec le pattern
 * existant des autres actions reviews).
 */
export async function getFilteredReviewIds(
	params: Pick<
		GetReviewsParams,
		| "search"
		| "sortBy"
		| "status"
		| "filterRating"
		| "hasResponse"
		| "productId"
		| "userId"
		| "dateFrom"
		| "dateTo"
	>,
): Promise<ActionState> {
	return runCrossPageIdsAction({
		rateLimitConfig: ADMIN_REVIEW_LIMITS.REFRESH,
		cap: BULK_REVIEW_ACTION_LIMIT,
		emptyMessage: "Aucun avis ne correspond aux filtres actuels",
		errorFallback: "Impossible de charger les avis filtrés",
		buildWhere: () =>
			buildReviewWhereClause(
				{
					cursor: undefined,
					direction: "forward",
					perPage: BULK_REVIEW_ACTION_LIMIT,
					...params,
				},
				true,
			),
		fetchIds: (where) =>
			prisma.productReview.findMany({
				where,
				select: { id: true },
				take: BULK_REVIEW_ACTION_LIMIT,
			}),
		fetchCount: (where) => prisma.productReview.count({ where }),
	});
}
