"use client";

import { LoadMore } from "@/shared/components/load-more";

import { loadMoreReviews } from "../actions/load-more-reviews";
import type { ReviewPublic, ReviewSortField } from "../types/review.types";
import { ReviewCard } from "./review-card";

interface ReviewsLoadMoreProps {
	productId: string;
	initialCursor: string | null;
	initialHasMore: boolean;
	initialDisplayedCount: number;
	totalCount: number;
	ratingFilter?: number;
	sortBy?: ReviewSortField;
}

/**
 * Thin wrapper around the generic <LoadMore> for product reviews.
 *
 * Parent re-mounts via key={`${ratingFilter}-${sortBy}`} (reviews-list.tsx)
 * to reset local state when filter/sort changes — see regression test
 * `reviews-load-more.regression.test.tsx`.
 */
export function ReviewsLoadMore({
	productId,
	initialCursor,
	initialHasMore,
	initialDisplayedCount,
	totalCount,
	ratingFilter,
	sortBy,
}: ReviewsLoadMoreProps) {
	return (
		<LoadMore<ReviewPublic>
			initialCursor={initialCursor}
			initialHasMore={initialHasMore}
			initialDisplayedCount={initialDisplayedCount}
			totalCount={totalCount}
			controlsId="reviews-list"
			itemsLabel="avis"
			itemsLabelPlural="avis"
			buttonLabel="Voir plus d'avis"
			errorMessage="Impossible de charger plus d'avis"
			itemsContainerLabel="Avis supplémentaires"
			getItemKey={(r) => r.id}
			renderItem={(r) => <ReviewCard review={r} />}
			loadFn={async (cursor) => {
				const result = await loadMoreReviews({
					productId,
					cursor,
					filterRating: ratingFilter,
					sortBy,
				});
				return {
					items: result.reviews,
					nextCursor: result.nextCursor,
					hasMore: result.hasMore,
					error: result.error,
				};
			}}
		/>
	);
}
