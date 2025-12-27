"use client"

import { useState } from "react"
import Image from "next/image"

import dynamic from "next/dynamic"
import { MediaLightboxSkeleton } from "@/shared/components/skeletons/lazy-loading"

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = dynamic(
	() => import("@/modules/media/components/media-lightbox"),
	{ ssr: false, loading: () => <MediaLightboxSkeleton /> }
)
import { CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/cn"
import { formatRelativeDate } from "@/shared/utils/dates"
import { RatingStars } from "@/shared/components/rating-stars"

import type { ReviewPublic } from "../types/review.types"

interface ReviewCardProps {
	review: ReviewPublic
	className?: string
}

/**
 * Carte d'affichage d'un avis client
 */
export function ReviewCard({ review, className }: ReviewCardProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false)
	const [lightboxIndex, setLightboxIndex] = useState(0)
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

	const hasMedia = review.medias.length > 0

	const openLightbox = (index: number) => {
		setLightboxIndex(index)
		setLightboxOpen(true)
	}

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

				{/* Photos (galerie) */}
				{hasMedia && (
					<>
						<div className="flex gap-2 flex-wrap">
							{review.medias.map((media, index) => (
								<button
									key={media.id}
									type="button"
									onClick={() => openLightbox(index)}
									aria-label={`Voir la photo ${index + 1} de l'avis`}
									className="relative size-20 md:size-24 rounded-lg overflow-hidden group cursor-zoom-in"
								>
									{/* Skeleton shimmer pendant chargement */}
									{!loadedImages.has(media.id) && (
										<div className="absolute inset-0 animate-shimmer rounded-lg" />
									)}
									<Image
										src={media.url}
										alt={media.altText || `Photo ${index + 1}`}
										fill
										onLoad={() => setLoadedImages((prev) => new Set(prev).add(media.id))}
										className={cn(
											"object-cover motion-safe:transition-all motion-safe:duration-300 motion-safe:group-hover:scale-105",
											loadedImages.has(media.id) ? "opacity-100" : "opacity-0"
										)}
										sizes="(min-width: 768px) 96px, 80px"
										quality={75}
									/>
								</button>
							))}
						</div>
						<MediaLightbox
							open={lightboxOpen}
							close={() => setLightboxOpen(false)}
							slides={review.medias.map((m) => ({ src: m.url }))}
							index={lightboxIndex}
						/>
					</>
				)}

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
	)
}
