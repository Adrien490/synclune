"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { Loader2 } from "lucide-react";
import { loadMoreReviews } from "../actions/load-more-reviews";
import { ReviewCard } from "./review-card";
import type { ReviewPublic, ReviewSortField } from "../types/review.types";

interface ReviewsLoadMoreProps {
	productId: string;
	initialCursor: string | null;
	initialHasMore: boolean;
	ratingFilter?: number;
	sortBy?: ReviewSortField;
}

/**
 * Client component for loading additional reviews
 * Manages local state for appended reviews and cursor pagination
 */
export function ReviewsLoadMore({
	productId,
	initialCursor,
	initialHasMore,
	ratingFilter,
	sortBy,
}: ReviewsLoadMoreProps) {
	const [additionalReviews, setAdditionalReviews] = useState<ReviewPublic[]>([]);
	const [cursor, setCursor] = useState(initialCursor);
	const [hasMore, setHasMore] = useState(initialHasMore);
	const [isPending, startTransition] = useTransition();

	if (!hasMore && additionalReviews.length === 0) {
		return null;
	}

	const handleLoadMore = () => {
		if (!cursor) return;

		startTransition(async () => {
			const result = await loadMoreReviews({
				productId,
				cursor,
				filterRating: ratingFilter,
				sortBy,
			});

			setAdditionalReviews((prev) => [...prev, ...result.reviews]);
			setCursor(result.nextCursor);
			setHasMore(result.hasMore);
		});
	};

	return (
		<>
			{/* Additional reviews loaded via "load more" */}
			{additionalReviews.length > 0 && (
				<div
					className="grid grid-cols-1 gap-4 lg:grid-cols-2"
					role="feed"
					aria-label="Avis supplémentaires"
				>
					{additionalReviews.map((review, index) => (
						<div
							key={review.id}
							className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4"
							style={{
								animationDelay: `${index * 50}ms`,
								animationFillMode: "backwards",
							}}
						>
							<ReviewCard review={review} />
						</div>
					))}
				</div>
			)}

			{/* Load more button */}
			{hasMore && (
				<div className="flex justify-center pt-2">
					<Button
						variant="outline"
						onClick={handleLoadMore}
						disabled={isPending}
						className="min-w-[200px]"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
								Chargement...
							</>
						) : (
							"Voir plus d'avis"
						)}
					</Button>
				</div>
			)}
		</>
	);
}
