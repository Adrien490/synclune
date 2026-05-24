import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { ProductMainSkeleton } from "@/modules/products/components/product-main-skeleton";
import { RecentlyViewedProductsSkeleton } from "@/modules/products/components/recently-viewed-products-skeleton";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
import { ProductReviewsSectionSkeleton } from "@/modules/reviews/components/product-reviews-section";

/**
 * Loading state for product detail page
 * Structure exacte : PageHeader → Gallery + ProductInfo/ProductDetails → Reviews → RecentlyViewed → Related
 *
 * IMPORTANT: L'ordre des composants doit correspondre exactement à page.tsx pour éviter le CLS.
 * Le subtree gallery+info+details est extrait dans `ProductMainSkeleton` (single source of truth
 * partagé entre ce loading.tsx et le Suspense fallback de page.tsx).
 */
export default function ProductDetailLoading() {
	return (
		<div
			className="relative min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label="Chargement du produit"
		>
			<span className="sr-only">Chargement du produit…</span>

			{/* Particle system placeholder */}
			<div
				className="from-primary/5 to-secondary/5 fixed inset-0 z-0 via-transparent"
				aria-hidden="true"
			/>

			<div className="relative z-10">
				{/* PageHeader Skeleton - Caché sur mobile comme le vrai PageHeader */}
				<PageHeaderSkeleton hasDescription={false} className="hidden sm:block" />

				{/* Main Content - Paddings alignés sur page.tsx */}
				<div className="bg-background pt-20 pb-6 sm:pt-4 sm:pb-12 lg:pt-6 lg:pb-16">
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<article className="space-y-12">
							<ProductMainSkeleton />

							{/* Separator avant avis clients */}
							<div className="bg-border h-px" />

							{/* ProductReviewsSection Skeleton */}
							<ProductReviewsSectionSkeleton />

							{/* Separator avant produits recemment vus */}
							<div className="bg-border h-px" />

							{/* RecentlyViewedProducts Skeleton */}
							<RecentlyViewedProductsSkeleton limit={4} />

							{/* Separator avant produits similaires */}
							<div className="bg-border h-px" />

							{/* RelatedProducts Skeleton */}
							<RelatedProductsSkeleton limit={4} />
						</article>
					</div>
				</div>
			</div>
		</div>
	);
}
