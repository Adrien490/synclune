"use server";

import { z } from "zod";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REVIEW_LOAD_MORE_LIMIT } from "@/shared/lib/rate-limit-config";

import { GET_REVIEWS_SORT_FIELDS } from "../constants/review.constants";
import { getReviews } from "../data/get-reviews";
import type { ReviewPublic, ReviewSortField } from "../types/review.types";

const loadMoreReviewsSchema = z.object({
	productId: z.cuid2(),
	cursor: z.cuid2(),
	filterRating: z.number().int().min(1).max(5).optional(),
	sortBy: z.enum(GET_REVIEWS_SORT_FIELDS).optional(),
});

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
	params: z.input<typeof loadMoreReviewsSchema>,
): Promise<LoadMoreReviewsResult> {
	try {
		const validation = loadMoreReviewsSchema.safeParse(params);
		if (!validation.success) return EMPTY;

		const rateCheck = await enforceRateLimitForCurrentUser(REVIEW_LOAD_MORE_LIMIT);
		if ("error" in rateCheck) return EMPTY;

		const { productId, cursor, filterRating, sortBy } = validation.data;

		const data = await getReviews(
			{
				productId,
				cursor,
				perPage: 10,
				direction: "forward",
				filterRating,
				sortBy: sortBy as ReviewSortField | undefined,
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
