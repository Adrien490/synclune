import { BadgeCheck } from "lucide-react";

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
	const userName = review.user.name ?? "Anonyme";
	const reviewIso = new Date(review.createdAt).toISOString();
	const isNew = isRecent(review.createdAt, 7);

	return (
		<article
			id={`review-${review.id}`}
			aria-label={`Avis de ${userName} — ${review.rating} sur 5 étoiles`}
			className={cn(
				"bg-card text-card-foreground overflow-hidden rounded-lg border shadow-sm",
				className,
			)}
		>
			<CardContent className="space-y-4 py-4">
				{/* En-tête: nom, date, étoiles */}
				<div>
					<div className="flex items-center gap-2">
						<span className="text-foreground truncate font-medium">{userName}</span>
						<Badge
							variant="outline"
							className="text-muted-foreground h-5 shrink-0 gap-1 px-1.5 py-0 text-[10px]"
						>
							<BadgeCheck className="size-3" aria-hidden="true" />
							Achat vérifié
						</Badge>
						{isNew && <Badge className="h-5 shrink-0 px-1.5 py-0 text-[10px]">Nouveau</Badge>}
					</div>
					<div className="mt-0.5 flex items-center gap-2">
						<RatingStars rating={review.rating} size="sm" />
						<time
							dateTime={reviewIso}
							title={formatDateLong(review.createdAt)}
							className="text-muted-foreground text-xs"
						>
							{formatRelativeDate(review.createdAt)}
						</time>
					</div>
				</div>

				{/* Titre (optionnel) et contenu */}
				<div className="space-y-2">
					{review.title && <h4 className="text-foreground font-medium">{review.title}</h4>}
					<ExpandableReviewContent content={review.content} />
				</div>

				{/* Photos (galerie) - Client Component */}
				{hasMedia && <ReviewCardGallery medias={review.medias} />}

				{/* Réponse de la marque (si présente) */}
				{review.response && (
					<div className="border-border mt-4 border-t pt-4">
						<div className="bg-muted/50 border-primary/30 rounded-lg border-l-2 p-3">
							<div className="mb-2 flex items-center gap-2">
								<span className="text-foreground text-xs font-medium">
									Réponse de {review.response.authorName}
								</span>
								<time
									dateTime={new Date(review.response.createdAt).toISOString()}
									title={formatDateLong(review.response.createdAt)}
									className="text-muted-foreground text-xs"
								>
									{formatRelativeDate(review.response.createdAt)}
								</time>
							</div>
							<p className="text-muted-foreground text-sm">{review.response.content}</p>
						</div>
					</div>
				)}
			</CardContent>
		</article>
	);
}
