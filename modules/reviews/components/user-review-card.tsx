"use client"

import Image from "next/image"
import Link from "next/link"
import { MessageSquare, ExternalLink } from "lucide-react"

import { CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/utils/cn"

import { RatingStars } from "@/shared/components/rating-stars"

import type { ReviewUser } from "../types/review.types"
import { UserReviewCardActions } from "./user-review-card-actions"
import { REVIEW_STATUS_LABELS } from "../constants/review.constants"

interface UserReviewCardProps {
	review: ReviewUser
	className?: string
}

const formatDate = (date: Date) => {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(date))
}

/**
 * Carte d'avis pour l'espace client "Mes avis"
 * Affichage uniquement - les actions sont dans UserReviewCardActions
 */
export function UserReviewCard({ review, className }: UserReviewCardProps) {
	const productImage = review.product.skus[0]?.images[0]

	return (
		<article className={cn("overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
			<CardContent className="p-0">
				<div className="flex flex-col sm:flex-row">
					{/* Image produit */}
					<div className="relative w-full sm:w-32 h-32 sm:h-auto shrink-0">
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
							<div className="w-full h-full bg-muted flex items-center justify-center">
								<MessageSquare className="size-8 text-muted-foreground" aria-hidden="true" />
							</div>
						)}
					</div>

					{/* Contenu */}
					<div className="flex-1 p-4 space-y-3">
						{/* En-tête: titre produit + statut */}
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<Link
									href={`/creations/${review.product.slug}`}
									className="font-medium hover:text-primary transition-colors line-clamp-1 flex items-center gap-1"
								>
									{review.product.title}
									<ExternalLink className="size-3 shrink-0" aria-hidden="true" />
								</Link>
								<div className="flex items-center gap-2 mt-1">
									<RatingStars rating={review.rating} size="sm" />
									<time
										dateTime={new Date(review.createdAt).toISOString()}
										className="text-xs text-muted-foreground"
									>
										{formatDate(review.createdAt)}
									</time>
								</div>
							</div>
							<Badge
								variant={review.status === "PUBLISHED" ? "default" : "secondary"}
								className="shrink-0"
								role="status"
							>
								{REVIEW_STATUS_LABELS[review.status]}
							</Badge>
						</div>

						{/* Titre de l'avis */}
						{review.title && (
							<h4 className="font-medium text-sm">{review.title}</h4>
						)}

						{/* Contenu de l'avis */}
						<p className="text-sm text-muted-foreground line-clamp-3">
							{review.content}
						</p>

						{/* Réponse de la marque */}
						{review.response && (
							<div className="bg-muted/50 rounded-lg p-3 mt-2">
								<p className="text-xs font-medium text-foreground mb-1">
									Réponse de {review.response.authorName}
								</p>
								<p className="text-sm text-muted-foreground line-clamp-2">
									{review.response.content}
								</p>
							</div>
						)}

						{/* Actions */}
						<UserReviewCardActions review={review} />
					</div>
				</div>
			</CardContent>
		</article>
	)
}
