import { BadgeCheck, Store } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/shared/components/ui/badge"
import { CardContent } from "@/shared/components/ui/card"
import { RatingStars } from "@/shared/components/rating-stars"
import { cn } from "@/shared/utils/cn"
import { RelativeDate } from "@/shared/components/relative-date"
import { ReviewCardGallery } from "./review-card-gallery"
import { ExpandableReviewContent } from "./expandable-review-content"

import type { ReviewHomepage } from "../types/review.types"

interface HomepageReviewCardProps {
	review: ReviewHomepage
	className?: string
}

/**
 * Simplified review card for homepage social proof section.
 * Relative date is computed on the client via RelativeDate to avoid
 * new Date() during prerendering.
 */
export function HomepageReviewCard({ review, className }: HomepageReviewCardProps) {
	const productImage = review.product.skus[0]?.images[0] ?? null
	const userName = review.user.name || "Anonyme"
	const reviewIso = new Date(review.createdAt).toISOString()

	return (
		<article
			aria-label={`Avis de ${userName} — ${review.rating} sur 5 étoiles`}
			itemScope
			itemType="https://schema.org/Review"
			className={cn(
				"overflow-hidden rounded-lg border-2 border-transparent bg-card text-card-foreground",
				"shadow-sm transition-[shadow,border-color,transform] duration-300 ease-out",
				"motion-reduce:transition-colors",
				"can-hover:hover:border-primary/40",
				"can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
				"motion-safe:can-hover:hover:scale-[1.01]",
				"focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/15",
				className,
			)}
		>
			<meta itemProp="author" content={userName} />
			<meta itemProp="datePublished" content={reviewIso} />
			<div itemProp="itemReviewed" itemScope itemType="https://schema.org/Product" className="hidden">
				<meta itemProp="name" content={review.product.title} />
			</div>
			<div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating" className="hidden">
				<meta itemProp="ratingValue" content={String(review.rating)} />
				<meta itemProp="bestRating" content="5" />
			</div>

			<CardContent className="py-4 space-y-3">
				{/* Header: name + verified badge */}
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium text-foreground truncate">
							{userName}
						</span>
						<Badge variant="outline" className="text-xs gap-1 px-1.5 py-0 h-5 shrink-0 text-muted-foreground">
							<BadgeCheck className="size-3" aria-hidden="true" />
							Achat vérifié
						</Badge>
					</div>
					<div className="flex items-center gap-2 mt-0.5">
						<RatingStars rating={review.rating} size="sm" />
						<RelativeDate date={review.createdAt} className="text-xs text-muted-foreground" />
					</div>
				</div>

				{/* Title (optional) + truncated content */}
				<div className="space-y-1">
					{review.title && (
						<h3 className="font-medium text-foreground text-sm">
							{review.title}
						</h3>
					)}
					<ExpandableReviewContent content={review.content} clampLines={3} />
				</div>

				{/* User-uploaded review photos with lightbox */}
				{review.medias.length > 0 && (
					<ReviewCardGallery medias={review.medias} />
				)}

				{/* Brand response (condensed) */}
				{review.response && (
					<div className="pt-2 border-t border-border">
						<div className="bg-muted/50 rounded-md p-2.5 border-l-2 border-primary/30">
							<div className="flex items-center gap-1.5 mb-1">
								<Store className="size-3 text-primary shrink-0" aria-hidden="true" />
								<span className="text-xs font-medium text-foreground">
									Réponse de {review.response.authorName}
								</span>
							</div>
							<p className="text-xs text-muted-foreground line-clamp-2">
								{review.response.content}
							</p>
						</div>
					</div>
				)}

				{/* Product link with thumbnail */}
				<div className="pt-1">
					<Link
						href={`/creations/${review.product.slug}`}
						className="flex items-center gap-2.5 group rounded-md p-1.5 -mx-1.5 transition-colors can-hover:hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
						aria-label={`Voir le produit : ${review.product.title}`}
					>
						{productImage && (
							<Image
								src={productImage.url}
								alt={productImage.altText || review.product.title}
								width={48}
								height={48}
								sizes="(min-width: 640px) 48px, 40px"
								className="size-10 sm:size-12 rounded-md object-cover"
								placeholder={productImage.blurDataUrl ? "blur" : "empty"}
								blurDataURL={productImage.blurDataUrl ?? undefined}
							/>
						)}
						<span className="text-xs text-foreground group-hover:underline truncate">
							{review.product.title}
						</span>
					</Link>
				</div>
			</CardContent>
		</article>
	)
}
