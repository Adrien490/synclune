import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton"
import { ReviewableProductCardSkeleton } from "./reviewable-product-card-skeleton"
import { UserReviewCardSkeleton } from "./user-review-card-skeleton"

export function ReviewsPageSkeleton() {
	return (
		<SkeletonGroup label="Chargement des avis">
			<div className="space-y-8">
				{/* Reviewable products section */}
				<div>
					<Skeleton className="h-6 w-48 mb-4 bg-muted/50" />
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<ReviewableProductCardSkeleton key={i} />
						))}
					</div>
				</div>

				{/* Reviews section */}
				<div>
					<Skeleton className="h-6 w-32 mb-4 bg-muted/50" />
					<div className="space-y-4">
						{Array.from({ length: 2 }).map((_, i) => (
							<UserReviewCardSkeleton key={i} />
						))}
					</div>
				</div>
			</div>
		</SkeletonGroup>
	)
}
