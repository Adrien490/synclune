import {
	Empty,
	EmptyActions,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Button } from "@/shared/components/ui/button";
import { Filter, MessageSquare } from "lucide-react";
import Link from "next/link";

import type { ReviewPublic, ProductReviewStatistics, ReviewSortField } from "../types/review.types";
import { ReviewCard } from "./review-card";
import { ReviewFilterResetButton } from "./review-filter-reset-button";
import { ReviewPhotosGallery } from "./review-photos-gallery";
import { ReviewSummary } from "./review-summary";
import { ReviewSortSelect } from "./review-sort-select";
import { ReviewsLoadMore } from "./reviews-load-more";

const EMPTY_REVIEWS: ReviewPublic[] = [];

interface ReviewsListProps {
	/** Avis initiaux (déjà résolus) */
	initialReviews: ReviewPublic[];
	/** Statistiques du produit */
	stats: ProductReviewStatistics;
	/** Nombre total d'avis */
	totalCount: number;
	/** ID du produit (pour chargement supplémentaire) */
	productId?: string;
	/** Curseur pour la pagination */
	nextCursor?: string | null;
	/** Indique s'il y a plus d'avis à charger */
	hasMore?: boolean;
	/** Filtre par note actif */
	ratingFilter?: number;
	/** Tri actif */
	sortBy?: ReviewSortField;
	/** Utilisateur authentifie (pour afficher le CTA d'avis) */
	isAuthenticated?: boolean;
}

/**
 * Liste des avis avec résumé, tri et pagination
 * Server component qui affiche les avis pré-chargés
 */
export function ReviewsList({
	initialReviews = EMPTY_REVIEWS,
	stats,
	totalCount,
	productId,
	nextCursor,
	hasMore,
	ratingFilter,
	sortBy,
	isAuthenticated,
}: ReviewsListProps) {
	const isFiltered = ratingFilter !== undefined;

	// Aucun avis (sans filtre)
	if (stats.totalCount === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<MessageSquare className="size-6" aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle>Aucun avis pour le moment</EmptyTitle>
				</EmptyHeader>
				<EmptyContent>
					<p className="text-muted-foreground text-sm">Soyez le premier à donner votre avis !</p>
				</EmptyContent>
				{isAuthenticated && (
					<EmptyActions>
						<Button variant="outline" asChild>
							<Link href="/mes-avis">Donner mon avis</Link>
						</Button>
					</EmptyActions>
				)}
			</Empty>
		);
	}

	// Aucun avis avec le filtre actif
	if (isFiltered && initialReviews.length === 0) {
		return (
			<div className="space-y-6">
				{/* Résumé avec distribution (toujours afficher pour pouvoir changer de filtre) */}
				<ReviewSummary stats={stats} />

				<Empty className="py-12">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Filter className="size-6" aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>
							Aucun avis à {ratingFilter} étoile{ratingFilter > 1 ? "s" : ""}
						</EmptyTitle>
					</EmptyHeader>
					<EmptyContent>
						<p className="text-muted-foreground text-sm">
							Essayez de sélectionner une autre note dans la distribution ci-dessus.
						</p>
					</EmptyContent>
					<EmptyActions>
						<ReviewFilterResetButton />
					</EmptyActions>
				</Empty>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Résumé avec distribution cliquable */}
			<ReviewSummary stats={stats} />

			{/* Toolbar: filtre actif + tri + CTA avis */}
			<div className="flex items-center justify-between gap-4">
				{/* Indicateur de filtre actif */}
				{isFiltered ? (
					<p className="text-muted-foreground text-sm" role="status" aria-live="polite">
						{totalCount} avis à {ratingFilter} étoile{ratingFilter > 1 ? "s" : ""} sur{" "}
						{stats.totalCount} au total
					</p>
				) : (
					<div />
				)}

				{/* Tri des avis */}
				{stats.totalCount > 1 && <ReviewSortSelect />}
			</div>

			{/* Galerie photos clients (Baymard) - seulement si pas filtré ou avis avec photos */}
			{!isFiltered && <ReviewPhotosGallery reviews={initialReviews} />}

			{/* Liste des avis */}
			<div
				className="grid grid-cols-1 gap-4 lg:grid-cols-2"
				role="feed"
				aria-label="Liste des avis clients"
			>
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

			{/* Load more + additional reviews */}
			{productId && (
				<ReviewsLoadMore
					productId={productId}
					initialCursor={nextCursor ?? null}
					initialHasMore={hasMore ?? false}
					ratingFilter={ratingFilter}
					sortBy={sortBy}
				/>
			)}
		</div>
	);
}
