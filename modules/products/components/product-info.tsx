import { Badge } from "@/shared/components/ui/badge";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { ReviewRatingLink } from "@/modules/reviews/components/review-rating-link";

interface ProductInfoProps {
	product: GetProductReturn;
	isInWishlist?: boolean;
	reviewStats?: ProductReviewStatistics;
}

/**
 * ProductInfo - Affiche les informations de base du produit
 *
 * Responsabilités :
 * - Titre du produit avec bouton wishlist
 * - Badge type (catégorie)
 * - Note avis cliquable
 * - Bouton wishlist
 */
export function ProductInfo({ product, isInWishlist, reviewStats }: ProductInfoProps) {
	return (
		<div className="space-y-4">
			{/* Titre avec bouton wishlist */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 space-y-2">
					<p
						className="text-foreground line-clamp-2 text-3xl/10 font-medium tracking-normal"
						itemProp="name"
					>
						{product.title}
					</p>
					{/* Badge note cliquable - scrolle vers les avis (mobile) */}
					{reviewStats && (
						<div className="sm:hidden">
							<ReviewRatingLink stats={reviewStats} />
						</div>
					)}
				</div>
				<div className="shrink-0 sm:hidden">
					<WishlistButton
						productTitle={product.title}
						productId={product.id}
						isInWishlist={isInWishlist ?? false}
						size="lg"
					/>
				</div>
			</div>

			{/* Labels et badges + bouton wishlist sur desktop */}
			<div className="flex flex-wrap items-center gap-2">
				{product.type && (
					<Badge
						variant="outline"
						className="border-primary/30 rounded-full px-3 py-1.5 text-xs/5 font-medium tracking-normal antialiased sm:py-1 sm:text-sm/6"
					>
						{product.type.label}
					</Badge>
				)}

				{/* Badge note cliquable sur desktop - scrolle vers les avis */}
				{reviewStats && (
					<div className="hidden sm:block">
						<ReviewRatingLink stats={reviewStats} />
					</div>
				)}

				{/* Bouton wishlist visible uniquement sur desktop - a droite du badge type */}
				<div className="ml-auto hidden sm:block">
					<WishlistButton
						productTitle={product.title}
						productId={product.id}
						isInWishlist={isInWishlist ?? false}
						size="lg"
					/>
				</div>
			</div>
		</div>
	);
}
