import { cn } from "@/shared/utils/cn"
import { RatingStars } from "@/shared/components/rating-stars"
import type { ProductReviewStatistics } from "../types/review.types"
import { formatRating } from "@/shared/utils/rating-utils"

interface ReviewSummaryCompactProps {
	stats: ProductReviewStatistics
	className?: string
}

/**
 * Resume compact des avis (note moyenne + nombre d'avis)
 * Utilise dans l'en-tete de section sur la page produit
 */
export function ReviewSummaryCompact({
	stats,
	className,
}: ReviewSummaryCompactProps) {
	if (stats.totalCount === 0) {
		return null
	}

	return (
		<div
			className={cn("flex items-center gap-2", className)}
			aria-label={`Note moyenne: ${formatRating(stats.averageRating)} sur 5, basee sur ${stats.totalCount} avis`}
		>
			<RatingStars
				rating={stats.averageRating}
				maxRating={5}
				size="sm"
			/>
			<span className="text-sm font-medium">
				{formatRating(stats.averageRating)}
			</span>
			<span className="text-sm text-muted-foreground">
				({stats.totalCount} avis)
			</span>
		</div>
	)
}
