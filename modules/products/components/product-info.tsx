import { Badge } from "@/shared/components/ui/badge";
import { ShareButton } from "@/modules/products/components/share-button";
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
 * - Titre du produit avec bouton wishlist + partage
 * - Badge type (catégorie)
 * - Note avis cliquable
 * - Bouton wishlist
 */
export function ProductInfo({ product, isInWishlist, reviewStats }: ProductInfoProps) {
	return (
		<div className="space-y-4">
			{/* Titre avec boutons share + wishlist */}
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
				<div className="flex shrink-0 items-center gap-1 sm:hidden">
					<ShareButton
						title={product.title}
						text={`Découvrez ${product.title} sur Synclune`}
						url={`/creations/${product.slug}`}
						size="lg"
					/>
					<WishlistButton
						productTitle={product.title}
						productId={product.id}
						isInWishlist={isInWishlist ?? false}
						size="lg"
					/>
				</div>
			</div>

			{/* Labels et badges + boutons share/wishlist sur desktop */}
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

				{/* Boutons share + wishlist sur desktop */}
				<div className="ml-auto hidden items-center gap-1 sm:flex">
					<ShareButton
						title={product.title}
						text={`Découvrez ${product.title} sur Synclune`}
						url={`/creations/${product.slug}`}
						size="lg"
					/>
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
