import Link from "next/link"
import { cn } from "@/shared/utils/cn"
import { formatRating } from "@/shared/utils/rating-utils"
import { RatingStars } from "@/shared/components/rating-stars"
import type { ProductReviewStatistics } from "../types/review.types"

interface ReviewRatingLinkProps {
	stats: ProductReviewStatistics
	className?: string
}

/**
 * Badge cliquable affichant la note moyenne et le nombre d'avis.
 * Scrolle vers la section #reviews au clic.
 *
 * @returns null si aucun avis
 */
export function ReviewRatingLink({ stats, className }: ReviewRatingLinkProps) {
	if (stats.totalCount === 0) {
		return null
	}

	return (
		<Link
			href="#reviews"
			className={cn(
				"inline-flex items-center gap-1.5 text-sm hover:underline underline-offset-4",
				"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
				className
			)}
			aria-label={`Note moyenne: ${formatRating(stats.averageRating)} sur 5, ${stats.totalCount} avis. Cliquez pour voir les avis.`}
		>
			<RatingStars
				rating={stats.averageRating}
				size="sm"
				ariaLabel=""
			/>
			<span className="font-medium">{formatRating(stats.averageRating)}</span>
			<span className="text-muted-foreground underline underline-offset-4">
				({stats.totalCount} avis)
			</span>
		</Link>
	)
}
