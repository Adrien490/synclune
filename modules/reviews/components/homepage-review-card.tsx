import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/shared/components/rating-stars";
import { cn } from "@/shared/utils/cn";
import { RelativeDate } from "@/shared/components/relative-date";
import { ReviewCardGallery } from "./review-card-gallery";
import { ExpandableReviewContent } from "./expandable-review-content";

import type { ReviewHomepage } from "../types/review.types";

interface HomepageReviewCardProps {
	review: ReviewHomepage;
	className?: string;
}

/**
 * Simplified review card for homepage social proof section.
 * Relative date is computed on the client via RelativeDate to avoid
 * new Date() during prerendering.
 */
export function HomepageReviewCard({ review, className }: HomepageReviewCardProps) {
	const productImage = review.product.skus[0]?.images[0] ?? null;
	const userName = review.user.name ?? "Anonyme";

	return (
		<article
			aria-label={`Avis de ${userName} — ${review.rating} sur 5 étoiles`}
			className={cn(
				"bg-card text-card-foreground overflow-hidden rounded-lg border-2 border-transparent",
				"shadow-sm transition-[shadow,border-color] duration-300 ease-out",
				"motion-reduce:transition-colors",
				"focus-within:border-primary/40 focus-within:shadow-primary/15 focus-within:shadow-lg",
				className,
			)}
		>
			<div className="space-y-3 px-4 py-4 sm:px-6">
				{/* Header: name + verified badge */}
				<div>
					<span className="text-foreground truncate font-medium">{userName}</span>
					<div className="mt-0.5 flex items-center gap-2">
						<RatingStars rating={review.rating} size="sm" />
						<RelativeDate date={review.createdAt} className="text-muted-foreground text-xs" />
					</div>
				</div>

				{/* Title (optional) + truncated content */}
				<div className="space-y-1">
					{review.title && <h3 className="text-foreground text-sm font-medium">{review.title}</h3>}
					<ExpandableReviewContent content={review.content} clampLines={3} />
				</div>

				{/* User-uploaded review photos with lightbox */}
				{review.medias.length > 0 && <ReviewCardGallery medias={review.medias} />}

				{/* Brand response (condensed) */}
				{review.response && (
					<aside
						role="note"
						aria-label="Réponse de Synclune"
						className="border-border border-t pt-2"
					>
						<div className="bg-muted/50 border-primary/30 rounded-md border-l-2 p-2.5">
							<span className="text-foreground mb-1 text-xs font-medium">Synclune</span>
							<p className="text-muted-foreground line-clamp-2 text-xs">
								{review.response.content}
							</p>
						</div>
					</aside>
				)}

				{/* Product link with thumbnail */}
				<div className="pt-1">
					<Link
						href={`/creations/${review.product.slug}`}
						className="group can-hover:hover:bg-muted/50 focus-visible:outline-ring -mx-1.5 flex items-center gap-2.5 rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
						aria-label={`Voir le produit : ${review.product.title}`}
					>
						{productImage && (
							<Image
								src={productImage.url}
								alt={productImage.altText ?? review.product.title}
								width={48}
								height={48}
								sizes="(min-width: 640px) 48px, 40px"
								className="size-10 rounded-md object-cover sm:size-12"
								placeholder={productImage.blurDataUrl ? "blur" : "empty"}
								blurDataURL={productImage.blurDataUrl ?? undefined}
								aria-hidden="true"
							/>
						)}
						<span className="text-foreground can-hover:group-hover:underline truncate text-xs">
							{review.product.title}
						</span>
					</Link>
				</div>
			</div>
		</article>
	);
}
