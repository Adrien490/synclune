import { Star } from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/utils/cn"
import { formatRating } from "@/shared/utils/rating-utils"
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
				"inline-flex items-center gap-1.5 text-sm transition-colors",
				"hover:text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
				className
			)}
			aria-label={`Note moyenne: ${formatRating(stats.averageRating)} sur 5, ${stats.totalCount} avis. Cliquez pour voir les avis.`}
		>
			<div className="flex items-center gap-0.5" aria-hidden="true">
				{Array.from({ length: 5 }, (_, i) => (
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
			<span className="font-medium">{formatRating(stats.averageRating)}</span>
			<span className="text-muted-foreground underline underline-offset-4">
				({stats.totalCount} avis)
			</span>
		</Link>
	)
}
