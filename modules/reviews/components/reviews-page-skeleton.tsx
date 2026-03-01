import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";
import { ReviewableProductCardSkeleton } from "./reviewable-product-card-skeleton";
import { UserReviewCardSkeleton } from "./user-review-card-skeleton";

export function ReviewableProductsSkeleton() {
	return (
		<SkeletonGroup label="Chargement des produits à évaluer">
			<div>
				<Skeleton className="bg-muted/50 mb-4 h-6 w-48" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<ReviewableProductCardSkeleton key={i} />
					))}
				</div>
			</div>
		</SkeletonGroup>
	);
}

export function UserReviewsSkeleton() {
	return (
		<SkeletonGroup label="Chargement des avis">
			<div>
				<Skeleton className="bg-muted/50 mb-4 h-6 w-32" />
				<div className="space-y-4">
					{Array.from({ length: 2 }).map((_, i) => (
						<UserReviewCardSkeleton key={i} />
					))}
				</div>
			</div>
		</SkeletonGroup>
	);
}

export function ReviewsPageSkeleton() {
	return (
		<div className="space-y-8">
			<ReviewableProductsSkeleton />
			<UserReviewsSkeleton />
		</div>
	);
}
