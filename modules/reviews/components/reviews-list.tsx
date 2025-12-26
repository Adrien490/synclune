import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty"
import { MessageSquare } from "lucide-react"

import type { ReviewPublic, ProductReviewStatistics } from "../types/review.types"
import { ReviewCard } from "./review-card"
import { ReviewSummary } from "./review-summary"

interface ReviewsListProps {
	/** Avis initiaux (déjà résolus) */
	initialReviews: ReviewPublic[]
	/** Statistiques du produit */
	stats: ProductReviewStatistics
	/** ID du produit (pour charger plus d'avis) */
	productId: string
	/** Curseur pour la page suivante */
	nextCursor?: string | null
	/** Y a-t-il plus d'avis à charger ? */
	hasMore: boolean
	/** Nombre total d'avis */
	totalCount: number
}

/**
 * Liste des avis avec résumé
 * Server component qui affiche les avis pré-chargés
 */
export function ReviewsList({
	initialReviews = [],
	stats,
	totalCount,
}: ReviewsListProps) {
	// Aucun avis
	if (totalCount === 0 || initialReviews.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<MessageSquare className="size-6" aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle>Aucun avis pour le moment</EmptyTitle>
				</EmptyHeader>
				<EmptyContent>
					<p className="text-sm text-muted-foreground">
						Soyez le premier à donner votre avis !
					</p>
				</EmptyContent>
			</Empty>
		)
	}

	return (
		<div className="space-y-6">
			{/* Résumé avec distribution */}
			<ReviewSummary stats={stats} />

			{/* Liste des avis */}
			<div className="space-y-4" role="feed" aria-label="Liste des avis clients">
				{initialReviews.map((review) => (
					<ReviewCard key={review.id} review={review} />
				))}
			</div>
		</div>
	)
}
