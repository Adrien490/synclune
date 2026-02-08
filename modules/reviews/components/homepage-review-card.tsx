"use client"

import { BadgeCheck } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/shared/components/ui/badge"
import { CardContent } from "@/shared/components/ui/card"
import { RatingStars } from "@/shared/components/rating-stars"
import { cn } from "@/shared/utils/cn"
import { formatRelativeDate } from "@/shared/utils/dates"

import type { ReviewHomepage } from "../types/review.types"

interface HomepageReviewCardProps {
	review: ReviewHomepage
	className?: string
}

/**
 * Simplified review card for homepage social proof section.
 * Client Component because formatRelativeDate uses new Date().
 */
export function HomepageReviewCard({ review, className }: HomepageReviewCardProps) {
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
						<span className="text-xs text-muted-foreground">
							{formatRelativeDate(review.createdAt)}
						</span>
					</div>
				</div>

				{/* Title (optional) + truncated content */}
				<div className="space-y-1">
					{review.title && (
						<h4 className="font-medium text-foreground text-sm">
							{review.title}
						</h4>
					)}
					<p itemProp="reviewBody" className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
						{review.content}
					</p>
				</div>

				{/* Product link */}
				<div className="pt-1">
					<Link
						href={`/creations/${review.product.slug}`}
						className="text-xs text-foreground hover:underline"
					>
						{review.product.title}
					</Link>
				</div>
			</CardContent>
		</article>
	)
}
