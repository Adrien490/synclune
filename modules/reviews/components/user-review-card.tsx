import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MessageSquare, ExternalLink } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";

import { RatingStars } from "@/shared/components/rating-stars";

import type { ReviewUser } from "../types/review.types";
import { UserReviewCardActions } from "./user-review-card-actions";
import { ReviewCardGallery } from "./review-card-gallery";
import { REVIEW_STATUS_LABELS } from "../constants/review.constants";

interface UserReviewCardProps {
	review: ReviewUser;
	className?: string;
}

const formatDate = (date: Date) => {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(date));
};

/**
 * Carte d'avis pour l'espace client "Mes avis"
 * Affichage uniquement - les actions sont dans UserReviewCardActions
 */
export function UserReviewCard({ review }: UserReviewCardProps) {
	const productImage = review.product.skus[0]?.images[0];

	return (
		<article>
			<div className="flex flex-col sm:flex-row">
				{/* Image produit */}
				<div className="relative aspect-[3/2] w-full shrink-0 sm:aspect-auto sm:h-auto sm:w-32">
					{productImage ? (
						<Image
							src={productImage.url}
							alt={productImage.altText ?? review.product.title}
							fill
							className="object-cover"
							sizes="(max-width: 640px) 100vw, 128px"
							placeholder={productImage.blurDataUrl ? "blur" : "empty"}
							blurDataURL={productImage.blurDataUrl ?? undefined}
						/>
					) : (
						<div className="bg-muted flex h-full w-full items-center justify-center">
							<MessageSquare className="text-muted-foreground size-8" aria-hidden="true" />
						</div>
					)}
				</div>

				{/* Contenu */}
				<div className="flex-1 space-y-3 p-4">
					{/* En-tête: titre produit + statut */}
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<Link
								href={`/creations/${review.product.slug}`}
								className="hover:text-primary line-clamp-1 flex items-center gap-1 font-medium transition-colors"
								title={review.product.title}
							>
								{review.product.title}
								<ExternalLink className="size-3 shrink-0" aria-hidden="true" />
							</Link>
							<div className="mt-1 flex flex-wrap items-center gap-2">
								<RatingStars rating={review.rating} size="sm" />
								<time
									dateTime={new Date(review.createdAt).toISOString()}
									className="text-muted-foreground text-xs"
								>
									{formatDate(review.createdAt)}
								</time>
								<Badge
									variant="outline"
									className="text-muted-foreground h-5 shrink-0 gap-1 px-1.5 py-0 text-[10px]"
								>
									<BadgeCheck className="size-3" aria-hidden="true" />
									Achat vérifié
								</Badge>
							</div>
						</div>
						<Badge
							variant={review.status === "PUBLISHED" ? "default" : "secondary"}
							className="shrink-0"
							aria-label={`Statut de l'avis : ${REVIEW_STATUS_LABELS[review.status]}`}
						>
							{REVIEW_STATUS_LABELS[review.status]}
						</Badge>
					</div>

					{/* Titre de l'avis */}
					{review.title && <h4 className="text-sm font-medium">{review.title}</h4>}

					{/* Contenu de l'avis */}
					<p className="text-muted-foreground line-clamp-3 text-sm">{review.content}</p>

					{/* Photos de l'avis */}
					{review.medias.length > 0 && <ReviewCardGallery medias={review.medias} />}

					{/* Réponse de la marque */}
					{review.response && (
						<div className="bg-muted/50 border-primary/30 mt-2 rounded-lg border-l-2 p-3">
							<div className="mb-1 flex items-baseline gap-2">
								<p className="text-foreground text-xs font-medium">
									Réponse de {review.response.authorName}
								</p>
								<time
									dateTime={new Date(review.response.createdAt).toISOString()}
									className="text-muted-foreground text-[10px]"
								>
									{formatDate(review.response.createdAt)}
								</time>
							</div>
							<p className="text-muted-foreground line-clamp-2 text-sm">
								{review.response.content}
							</p>
						</div>
					)}

					{/* Actions */}
					<UserReviewCardActions review={review} />
				</div>
			</div>
		</article>
	);
}
