import { Skeleton } from "@/shared/components/ui/skeleton"

import { getReviews } from "../data/get-reviews"
import { getProductReviewStats } from "../data/get-product-review-stats"
import { ReviewsList } from "./reviews-list"
import { ReviewSummaryCompact } from "./review-summary-compact"
import type { ReviewPublic } from "../types/review.types"

interface ProductReviewsSectionProps {
	productId: string
	productSlug: string
	/** Filtre par note (1-5), passé depuis les searchParams de la page */
	ratingFilter?: number
}

/**
 * Section des avis sur la page produit
 * Server component qui charge les données et affiche les avis
 */
export async function ProductReviewsSection({
	productId,
	productSlug,
	ratingFilter,
}: ProductReviewsSectionProps) {
	// Charger les avis et stats en parallèle
	// Le filtre s'applique aux avis mais pas aux stats (pour garder la distribution complète)
	const [reviewsData, stats] = await Promise.all([
		getReviews({
			productId,
			perPage: 10,
			filterRating: ratingFilter,
		}),
		getProductReviewStats(productId),
	])
	const reviews = (reviewsData?.reviews ?? []) as ReviewPublic[]

	// Nombre d'avis filtrés vs total
	const isFiltered = ratingFilter !== undefined
	const filteredCount = reviewsData.totalCount

	return (
		<section
			id="reviews"
			className="scroll-mt-20"
			aria-labelledby="reviews-title"
			itemScope
			itemType="https://schema.org/AggregateRating"
		>
			{/* Schema.org AggregateRating microdata */}
			{stats.totalCount > 0 && (
				<>
					<meta itemProp="ratingValue" content={String(stats.averageRating)} />
					<meta itemProp="reviewCount" content={String(stats.totalCount)} />
					<meta itemProp="bestRating" content="5" />
					<meta itemProp="worstRating" content="1" />
				</>
			)}

			{/* En-tête de section */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<h2 id="reviews-title" className="text-xl font-semibold">Avis clients</h2>
					{stats.totalCount > 0 && (
						<ReviewSummaryCompact stats={stats} />
					)}
				</div>
			</div>

			{/* Liste des avis */}
			<ReviewsList
				initialReviews={reviews}
				stats={stats}
				productId={productId}
				nextCursor={reviewsData.pagination.nextCursor}
				hasMore={reviewsData.pagination.hasNextPage}
				totalCount={isFiltered ? filteredCount : reviewsData.totalCount}
				ratingFilter={ratingFilter}
			/>
		</section>
	)
}

/**
 * Skeleton pour le chargement de la section avis
 */
export function ProductReviewsSectionSkeleton() {
	return (
		<section className="space-y-6" aria-busy="true" aria-label="Chargement des avis">
			<div className="flex items-center gap-3" aria-hidden="true">
				<Skeleton className="h-6 w-32" />
			</div>

			{/* Skeleton résumé */}
			<div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
				<div className="flex flex-col items-center">
					<Skeleton className="h-14 w-14" />
					<Skeleton className="h-4 w-24 mt-2" />
					<Skeleton className="h-3 w-16 mt-1" />
				</div>
				<div className="flex-1 space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center gap-3">
							<Skeleton className="h-4 w-14" />
							<Skeleton className="h-2 flex-1" />
							<Skeleton className="h-4 w-10" />
						</div>
					))}
				</div>
			</div>

			{/* Skeleton avis */}
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="border rounded-lg p-4 space-y-4">
						<div className="flex items-start gap-3">
							<Skeleton className="size-10 rounded-full" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-32" />
							</div>
						</div>
						<Skeleton className="h-16 w-full" />
					</div>
				))}
			</div>
		</section>
	)
}
