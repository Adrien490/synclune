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
	/** Nombre total d'avis */
	totalCount: number
	/** ID du produit (pour chargement supplémentaire) */
	productId?: string
	/** Curseur pour la pagination */
	nextCursor?: string | null
	/** Indique s'il y a plus d'avis à charger */
	hasMore?: boolean
}

/**
 * Liste des avis avec résumé
 * Server component qui affiche les avis pré-chargés
 */
export function ReviewsList({
	initialReviews = [],
	stats,
	totalCount,
	productId: _productId,
	nextCursor: _nextCursor,
	hasMore: _hasMore,
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
				{initialReviews.map((review, index) => (
					<div
						key={review.id}
						className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4"
						style={{
							animationDelay: `${index * 50}ms`,
							animationFillMode: "backwards",
						}}
					>
						<ReviewCard review={review} />
					</div>
				))}
			</div>
		</div>
	)
}
