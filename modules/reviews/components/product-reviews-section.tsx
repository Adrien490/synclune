import { Skeleton } from "@/shared/components/ui/skeleton";
import { getSession } from "@/modules/auth/lib/get-current-session";

import { getReviews } from "../data/get-reviews";
import { getProductReviewStats } from "../data/get-product-review-stats";
import { ReviewsList } from "./reviews-list";
import { ReviewSummaryCompact } from "./review-summary-compact";
import type { ReviewPublic, ReviewSortField, ProductReviewStatistics } from "../types/review.types";

interface ProductReviewsSectionProps {
	productId: string;
	productSlug: string;
	/** Filtre par note (1-5), passé depuis les searchParams de la page */
	ratingFilter?: number;
	/** Tri des avis */
	sortBy?: ReviewSortField;
	/** Pre-fetched stats to avoid double fetch from parent page */
	reviewStats?: ProductReviewStatistics;
}

/**
 * Section des avis sur la page produit
 * Server component qui charge les données et affiche les avis
 */
export async function ProductReviewsSection({
	productId,
	productSlug: _productSlug,
	ratingFilter,
	sortBy,
	reviewStats,
}: ProductReviewsSectionProps) {
	// Charger les avis (et stats seulement si pas déjà fournies en prop)
	// Le filtre s'applique aux avis mais pas aux stats (pour garder la distribution complète)
	const [reviewsData, stats, session] = await Promise.all([
		getReviews({
			productId,
			perPage: 10,
			filterRating: ratingFilter,
			sortBy,
		}),
		reviewStats ? Promise.resolve(reviewStats) : getProductReviewStats(productId),
		getSession(),
	]);
	const reviews = (reviewsData?.reviews ?? []) as ReviewPublic[];

	// Nombre d'avis filtrés vs total
	const isFiltered = ratingFilter !== undefined;
	const filteredCount = reviewsData.totalCount;

	return (
		<section id="reviews" className="scroll-mt-20" aria-labelledby="reviews-title">
			{/* En-tête de section */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 id="reviews-title" className="text-xl font-semibold">
						Avis clients
					</h2>
					{stats.totalCount > 0 && <ReviewSummaryCompact stats={stats} />}
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
				sortBy={sortBy}
				isAuthenticated={!!session?.user}
			/>
		</section>
	);
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
			<div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
				<div className="flex flex-col items-center">
					<Skeleton className="h-14 w-14" />
					<Skeleton className="mt-2 h-4 w-24" />
					<Skeleton className="mt-1 h-3 w-16" />
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
					<div key={i} className="space-y-4 rounded-lg border p-4">
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
	);
}
