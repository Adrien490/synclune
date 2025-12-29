import { ReviewCardSkeleton } from "./review-card-skeleton";

/**
 * Skeleton pour liste de ReviewCard
 */
export function ReviewsListSkeleton({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map((_, i) => (
				<ReviewCardSkeleton key={i} showMedia={i === 0} />
			))}
		</div>
	);
}
