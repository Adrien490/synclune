import { BadgeCheck, Store } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { formatRelativeDate, formatDateLong, isRecent } from "@/shared/utils/dates";
import { RatingStars } from "@/shared/components/rating-stars";
import { ReviewCardGallery } from "./review-card-gallery";
import { ExpandableReviewContent } from "./expandable-review-content";

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
	const userName = review.user.name || "Anonyme";
	const reviewIso = new Date(review.createdAt).toISOString();
	const isNew = isRecent(review.createdAt, 7);

	return (
		<article
			id={`review-${review.id}`}
			aria-label={`Avis de ${userName} — ${review.rating} sur 5 étoiles`}
			itemScope
			itemType="https://schema.org/Review"
			className={cn("overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm", className)}
		>
			{/* Schema.org Review microdata */}
			<meta itemProp="author" content={userName} />
			<meta itemProp="datePublished" content={reviewIso} />
			<div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating" className="hidden">
				<meta itemProp="ratingValue" content={String(review.rating)} />
				<meta itemProp="bestRating" content="5" />
			</div>

			<CardContent className="py-4 space-y-4">
				{/* En-tête: nom, date, étoiles */}
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium text-foreground truncate">
							{userName}
						</span>
						<Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 shrink-0 text-muted-foreground">
							<BadgeCheck className="size-3" aria-hidden="true" />
							Achat vérifié
						</Badge>
						{isNew && (
							<Badge className="text-[10px] px-1.5 py-0 h-5 shrink-0">
								Nouveau
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-2 mt-0.5">
						<RatingStars rating={review.rating} size="sm" />
						<time
							dateTime={reviewIso}
							title={formatDateLong(review.createdAt)}
							className="text-xs text-muted-foreground"
						>
							{formatRelativeDate(review.createdAt)}
						</time>
					</div>
				</div>

				{/* Titre (optionnel) et contenu */}
				<div className="space-y-2">
					{review.title && (
						<h4 className="font-medium text-foreground">
							{review.title}
						</h4>
					)}
					<ExpandableReviewContent content={review.content} />
				</div>

				{/* Photos (galerie) - Client Component */}
				{hasMedia && <ReviewCardGallery medias={review.medias} />}

				{/* Réponse de la marque (si présente) */}
				{review.response && (
					<div className="mt-4 pt-4 border-t border-border">
						<div className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary/30">
							<div className="flex items-center gap-2 mb-2">
								<Store className="size-3.5 text-primary/70 shrink-0" aria-hidden="true" />
								<span className="text-xs font-medium text-foreground">
									Réponse de {review.response.authorName}
								</span>
								<time
									dateTime={new Date(review.response.createdAt).toISOString()}
									title={formatDateLong(review.response.createdAt)}
									className="text-xs text-muted-foreground"
								>
									{formatRelativeDate(review.response.createdAt)}
								</time>
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
