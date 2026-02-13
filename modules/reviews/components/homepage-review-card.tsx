import { BadgeCheck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/shared/components/ui/badge"
import { CardContent } from "@/shared/components/ui/card"
import { RatingStars } from "@/shared/components/rating-stars"
import { cn } from "@/shared/utils/cn"
import { RelativeDate } from "@/shared/components/relative-date"

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

	return (
		<article
			itemScope
			itemType="https://schema.org/Review"
			className={cn(
				"overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
				className,
			)}
		>
			<meta itemProp="author" content={review.user.name || "Anonyme"} />
			<meta itemProp="datePublished" content={new Date(review.createdAt).toISOString()} />
			<div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating" className="hidden">
				<meta itemProp="ratingValue" content={String(review.rating)} />
				<meta itemProp="bestRating" content="5" />
			</div>

			<CardContent className="py-4 space-y-3">
				{/* Header: name + verified badge */}
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium text-foreground truncate">
							{review.user.name || "Anonyme"}
						</span>
						<Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 shrink-0 text-muted-foreground">
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
					<p itemProp="reviewBody" className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
						{review.content}
					</p>
				</div>

				{/* User-uploaded review photos */}
				{review.medias.length > 0 && (
					<div className="flex gap-2">
						{review.medias.slice(0, 3).map((media) => (
							<Image
								key={media.id}
								src={media.url}
								alt={media.altText || "Photo de l'avis"}
								width={64}
								height={64}
								sizes="64px"
								className="size-16 rounded object-cover"
								placeholder={media.blurDataUrl ? "blur" : "empty"}
								blurDataURL={media.blurDataUrl ?? undefined}
							/>
						))}
					</div>
				)}

				{/* Product link with thumbnail */}
				<div className="pt-1">
					<Link
						href={`/creations/${review.product.slug}`}
						className="flex items-center gap-2 group"
						aria-label={`Voir le produit : ${review.product.title}`}
					>
						{productImage && (
							<Image
								src={productImage.url}
								alt={productImage.altText || review.product.title}
								width={32}
								height={32}
								sizes="32px"
								className="size-8 rounded object-cover"
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
