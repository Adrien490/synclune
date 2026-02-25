import type { ReviewUser } from "../types/review.types"
import { UserReviewCard } from "./user-review-card"

interface UserReviewsSectionProps {
	reviews: ReviewUser[]
}

export function UserReviewsSection({ reviews }: UserReviewsSectionProps) {
	return (
		<section aria-labelledby="reviews-heading">
			<h2 id="reviews-heading" className="text-lg/7 tracking-tight antialiased font-semibold mb-4">
				Mes avis ({reviews.length})
			</h2>
			<div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/50">
				{reviews.map((review) => (
					<UserReviewCard key={review.id} review={review} />
				))}
			</div>
		</section>
	)
}
