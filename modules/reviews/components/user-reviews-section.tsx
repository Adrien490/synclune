import type { ReviewUser } from "../types/review.types";
import { UserReviewCard } from "./user-review-card";

interface UserReviewsSectionProps {
	reviews: ReviewUser[];
}

export function UserReviewsSection({ reviews }: UserReviewsSectionProps) {
	return (
		<section aria-labelledby="reviews-heading">
			<h2 id="reviews-heading" className="mb-4 text-lg/7 font-semibold tracking-tight antialiased">
				Mes avis ({reviews.length})
			</h2>
			<div className="border-border/60 divide-border/50 divide-y overflow-hidden rounded-xl border">
				{reviews.map((review) => (
					<UserReviewCard key={review.id} review={review} />
				))}
			</div>
		</section>
	);
}
