import { CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { formatRelativeDate } from "@/shared/utils/dates";
import { RatingStars } from "@/shared/components/rating-stars";
import { ReviewCardGallery } from "./review-card-gallery";

import type { ReviewPublic } from "../types/review.types";

interface ReviewCardProps {
	review: ReviewPublic;
	className?: string;
}

/**
 * Carte d'affichage d'un avis client (Server Component)
 * La galerie photos est extraite dans un Client Component séparé
 */
export function ReviewCard({ review, className }: ReviewCardProps) {
	const hasMedia = review.medias.length > 0;

	return (
		<article
			id={`review-${review.id}`}
			itemScope
			itemType="https://schema.org/Review"
			className={cn("overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm", className)}
		>
			{/* Schema.org Review microdata */}
			<meta itemProp="author" content={review.user.name || "Anonyme"} />
			<meta itemProp="datePublished" content={new Date(review.createdAt).toISOString()} />
			<div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating" className="hidden">
				<meta itemProp="ratingValue" content={String(review.rating)} />
				<meta itemProp="bestRating" content="5" />
			</div>

			<CardContent className="py-4 space-y-4">
				{/* En-tête: nom, date, étoiles */}
				<div>
					<span className="font-medium text-foreground truncate">
						{review.user.name || "Anonyme"}
					</span>
					<div className="flex items-center gap-2 mt-0.5">
						<RatingStars rating={review.rating} size="sm" />
						<span className="text-xs text-muted-foreground">
							{formatRelativeDate(review.createdAt)}
						</span>
					</div>
				</div>

				{/* Titre (optionnel) et contenu */}
				<div className="space-y-2">
					{review.title && (
						<h4 className="font-medium text-foreground">
							{review.title}
						</h4>
					)}
					<p itemProp="reviewBody" className="text-sm text-muted-foreground leading-relaxed">
						{review.content}
					</p>
				</div>

				{/* Photos (galerie) - Client Component */}
				{hasMedia && <ReviewCardGallery medias={review.medias} />}

				{/* Réponse de la marque (si présente) */}
				{review.response && (
					<div className="mt-4 pt-4 border-t border-border">
						<div className="bg-muted/50 rounded-lg p-3">
							<div className="flex items-center gap-2 mb-2">
								<span className="text-xs font-medium text-foreground">
									Réponse de {review.response.authorName}
								</span>
								<span className="text-xs text-muted-foreground">
									{formatRelativeDate(review.response.createdAt)}
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								{review.response.content}
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</article>
	);
}
