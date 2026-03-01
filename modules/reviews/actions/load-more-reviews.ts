"use server";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REVIEW_LOAD_MORE_LIMIT } from "@/shared/lib/rate-limit-config";

import { getReviews } from "../data/get-reviews";
import type { ReviewPublic, ReviewSortField } from "../types/review.types";

interface LoadMoreReviewsParams {
	productId: string;
	cursor: string;
	filterRating?: number;
	sortBy?: ReviewSortField;
}

interface LoadMoreReviewsResult {
	reviews: ReviewPublic[];
	nextCursor: string | null;
	hasMore: boolean;
	error?: string;
}

const EMPTY: LoadMoreReviewsResult = { reviews: [], nextCursor: null, hasMore: false };

/**
 * Server action to load the next page of reviews
 * Used by the "Voir plus d'avis" button
 */
export async function loadMoreReviews(
	params: LoadMoreReviewsParams,
): Promise<LoadMoreReviewsResult> {
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(REVIEW_LOAD_MORE_LIMIT);
		if ("error" in rateCheck) return EMPTY;

		const data = await getReviews(
			{
				productId: params.productId,
				cursor: params.cursor,
				perPage: 10,
				direction: "forward",
				filterRating: params.filterRating,
				sortBy: params.sortBy,
			},
			{ isAdmin: false },
		);

		return {
			reviews: data.reviews as ReviewPublic[],
			nextCursor: data.pagination.nextCursor,
			hasMore: data.pagination.hasNextPage,
		};
	} catch {
		return {
			...EMPTY,
			error: "Impossible de charger plus d'avis",
		};
	}
}
