import { Star } from "lucide-react"
import { Progress } from "@/shared/components/ui/progress"
import { cn } from "@/shared/utils/cn"
import { formatRating } from "../utils/stats.utils"
import type { ProductReviewStatistics } from "../types/review.types"
import { REVIEW_CONFIG } from "../constants/review.constants"

interface ReviewSummaryProps {
	stats: ProductReviewStatistics
	className?: string
}

/**
 * Résumé des avis avec note moyenne et distribution
 */
export function ReviewSummary({
	stats,
	className,
}: ReviewSummaryProps) {
	return (
		<section
			role="region"
			aria-labelledby="review-summary-title"
			className={cn("flex flex-col sm:flex-row gap-6 sm:gap-10", className)}
		>
			{/* Note moyenne */}
			<div className="flex flex-col items-center justify-center text-center">
				<h3 id="review-summary-title" className="sr-only">Résumé des avis</h3>
				<div className="text-5xl font-bold text-foreground" aria-label={`Note moyenne: ${formatRating(stats.averageRating)} sur 5`}>
					{formatRating(stats.averageRating)}
				</div>
				<div className="flex items-center gap-1 mt-2" aria-hidden="true">
					{Array.from({ length: REVIEW_CONFIG.MAX_RATING }, (_, i) => (
						<Star
							key={i}
							className={cn(
								"size-4",
								i < Math.round(stats.averageRating)
									? "fill-amber-400 text-amber-400"
									: "fill-muted text-muted-foreground/30"
							)}
						/>
					))}
				</div>
				<div className="text-sm text-muted-foreground mt-1">
					{stats.totalCount} avis
				</div>
			</div>

			{/* Distribution */}
			<div className="flex-1 space-y-2">
				{stats.distribution.map(({ rating, count, percentage }) => (
					<div
						key={rating}
						className="flex items-center gap-3 w-full"
					>
						{/* Label (étoiles) */}
						<span className="text-sm font-medium w-14 text-left text-muted-foreground">
							{rating} étoile{rating > 1 ? "s" : ""}
						</span>

						{/* Barre de progression */}
						<div className="flex-1">
							<Progress
								value={percentage}
								className="h-2"
								aria-label={`${rating} étoile${rating > 1 ? "s" : ""}: ${percentage}%`}
							/>
						</div>

						{/* Pourcentage */}
						<span className="text-sm w-10 text-right text-muted-foreground">
							{percentage}%
						</span>

						{/* Nombre d'avis */}
						<span className="text-xs text-muted-foreground w-12 text-right">
							({count})
						</span>
					</div>
				))}
			</div>
		</section>
	)
}

/**
 * Version compacte du résumé (pour header section)
 */
export function ReviewSummaryCompact({
	stats,
	className,
}: {
	stats: ProductReviewStatistics
	className?: string
}) {
	if (stats.totalCount === 0) {
		return null
	}

	return (
		<div className={cn("flex items-center gap-2", className)} aria-label={`Note moyenne: ${formatRating(stats.averageRating)} sur 5, ${stats.totalCount} avis`}>
			<div className="flex items-center" aria-hidden="true">
				<Star className="size-4 fill-amber-400 text-amber-400" />
			</div>
			<span className="font-medium">{formatRating(stats.averageRating)}</span>
			<span className="text-muted-foreground">
				({stats.totalCount} avis)
			</span>
		</div>
	)
}
