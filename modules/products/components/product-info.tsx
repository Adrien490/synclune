import { Badge } from "@/shared/components/ui/badge";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { Crown } from "lucide-react";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { ReviewRatingLink } from "@/modules/reviews/components/review-rating-link";
import { ProductHighlights } from "./product-highlights";

interface ProductInfoProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	isInWishlist?: boolean;
	reviewStats?: ProductReviewStatistics;
}

/**
 * ProductInfo - Affiche les informations de base du produit
 *
 * Responsabilités :
 * - Titre du produit avec bouton wishlist
 * - Description
 * - Badge type (catégorie)
 * - Badge collection avec lien
 * - Badge "Créé à la main"
 */
export function ProductInfo({
	product,
	defaultSku,
	isInWishlist,
	reviewStats,
}: ProductInfoProps) {
	return (
		<div className="space-y-4">
			{/* Titre avec bouton wishlist - titre masque sur desktop car affiche dans PageHeader */}
			<div className="flex items-start justify-between gap-4 sm:hidden">
				<div className="flex-1 space-y-2">
					<h1
						className="text-3xl/10 font-bold tracking-tight text-foreground line-clamp-2"
						itemProp="name"
					>
						{product.title}
					</h1>
					{/* Badge note cliquable - scrolle vers les avis */}
					{reviewStats && <ReviewRatingLink stats={reviewStats} />}
				</div>
				<div className="shrink-0">
					<WishlistButton
						productTitle={product.title}
						productId={product.id}
						isInWishlist={isInWishlist ?? false}
						size="lg"
					/>
				</div>
			</div>

			{/* Prix compact visible sur mobile - above the fold, plus proéminent */}
			<div className="sm:hidden space-y-1">
				<div className="flex items-baseline gap-2 flex-wrap">
					<p className="text-3xl font-bold text-foreground tracking-tight">
						{formatEuro(defaultSku.priceInclTax)}
					</p>
					{defaultSku.compareAtPrice && defaultSku.compareAtPrice > defaultSku.priceInclTax && (
						<>
							<span className="text-lg text-muted-foreground line-through font-normal">
								{formatEuro(defaultSku.compareAtPrice)}
							</span>
							<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground">
								-{Math.round(((defaultSku.compareAtPrice - defaultSku.priceInclTax) / defaultSku.compareAtPrice) * 100)}%
							</span>
						</>
					)}
				</div>
			</div>

			{/* Labels et badges + bouton wishlist sur desktop */}
			<div className="flex flex-wrap items-center gap-2">
				{product.type && (
					<Badge
						variant="outline"
						className="text-xs/5 sm:text-sm/6 tracking-normal antialiased font-medium px-3 py-1.5 sm:py-1 rounded-full border-primary/30"
					>
						<Crown className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
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
				<div className="hidden sm:block ml-auto">
					<WishlistButton
						productTitle={product.title}
						productId={product.id}
						isInWishlist={isInWishlist ?? false}
						size="lg"
					/>
				</div>
			</div>

			{/* Highlights produit - scanabilite UX */}
			<ProductHighlights product={product} />

			{/* Description - max-w-prose pour lisibilité WCAG (80 chars/ligne), leading-relaxed (1.625) */}
			{product.description && (
				<div
					id="product-description"
					className="text-base tracking-normal antialiased text-muted-foreground leading-relaxed max-w-prose space-y-3"
					itemProp="description"
				>
					{product.description.split("\n").map((line, i) => (
						<p key={`desc-line-${i}`}>{line || "\u00A0"}</p>
					))}
				</div>
			)}
		</div>
	);
}
