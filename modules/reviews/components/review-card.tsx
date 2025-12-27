"use client"

import { useState } from "react"
import Image from "next/image"
import { CheckCircle2 } from "lucide-react"

import MediaLightbox from "@/modules/media/components/media-lightbox"
import { CardContent } from "@/shared/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { cn } from "@/shared/utils/cn"

import type { ReviewPublic } from "../types/review.types"
import { ReviewStars } from "./review-stars"

/**
 * Formate une date en format relatif français
 */
function formatRelativeDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date
	const now = new Date()
	const diffMs = now.getTime() - d.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return "Aujourd'hui"
	if (diffDays === 1) return "Hier"
	if (diffDays < 7) return `Il y a ${diffDays} jours`
	if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${diffDays >= 14 ? "s" : ""}`
	if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`
	return `Il y a ${Math.floor(diffDays / 365)} an${diffDays >= 730 ? "s" : ""}`
}

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
	const userInitials = review.user.name
		?.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2) || "?"

	const openLightbox = (index: number) => {
		setLightboxIndex(index)
		setLightboxOpen(true)
	}

	return (
		<article
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
				{/* En-tête: Avatar, nom, date, étoiles */}
				<div className="flex items-start gap-3">
					<Avatar className="size-10">
						<AvatarImage src={review.user.image || undefined} alt={review.user.name || "Utilisateur"} />
						<AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
					</Avatar>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="font-medium text-foreground truncate">
								{review.user.name || "Anonyme"}
							</span>
							<span className="inline-flex items-center gap-1 text-xs text-emerald-600">
								<CheckCircle2 className="size-3" aria-hidden="true" />
								Achat vérifié
							</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5">
							<ReviewStars rating={review.rating} size="sm" />
							<span className="text-xs text-muted-foreground">
								{formatRelativeDate(review.createdAt)}
							</span>
						</div>
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
								<span className="text-xs font-medium text-primary">
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
