import { cn } from "@/shared/utils/cn";
import { RatingStars } from "@/shared/components/rating-stars";
import { REVIEW_CONFIG } from "../constants/review.constants";
import type { ProductReviewStatistics } from "../types/review.types";
import { formatRating } from "@/shared/utils/rating-utils";
import { RatingDistribution } from "./rating-distribution";

/** Seuil minimum d'avis pour afficher la distribution (Baymard) */
const MIN_REVIEWS_FOR_DISTRIBUTION = 5;

interface ReviewSummaryProps {
	stats: ProductReviewStatistics;
	className?: string;
}

/**
 * Résumé des avis avec note moyenne et distribution cliquable
 * Baymard: La distribution est le feature le plus utilisé de la section avis
 * Note: Cacher la distribution si < 5 avis pour éviter la sur-interprétation
 */
export function ReviewSummary({ stats, className }: ReviewSummaryProps) {
	const showDistribution = stats.totalCount >= MIN_REVIEWS_FOR_DISTRIBUTION;

	return (
		<section
			aria-labelledby="review-summary-title"
			className={cn("flex max-w-2xl flex-col gap-6 sm:flex-row sm:gap-10", className)}
		>
			{/* Note moyenne */}
			<div className="flex shrink-0 flex-col items-center justify-center text-center">
				<h3 id="review-summary-title" className="sr-only">
					Résumé des avis
				</h3>
				<div className="text-foreground text-5xl font-bold" aria-hidden="true">
					{formatRating(stats.averageRating)}
				</div>
				<div className="mt-2">
					<RatingStars
						rating={stats.averageRating}
						maxRating={REVIEW_CONFIG.MAX_RATING}
						size="sm"
					/>
				</div>
				<div className="text-muted-foreground mt-1 text-sm">{stats.totalCount} avis</div>
			</div>

			{/* Distribution cliquable (Baymard: 90% des users cliquent pour filtrer) */}
			{showDistribution && (
				<div className="flex-1">
					<RatingDistribution distribution={stats.distribution} />
				</div>
			)}
		</section>
	);
}
