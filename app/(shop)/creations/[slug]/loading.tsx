import { ProductMainSkeleton } from "@/modules/products/components/product-main-skeleton";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
import { BreadcrumbNavSkeleton } from "@/shared/components/breadcrumb-nav";

/**
 * Loading state for product detail page
 * Structure exacte : BreadcrumbNav → Gallery + ProductInfo/ProductDetails → Related
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

			<div className="relative z-10">
				{/* Main Content - Paddings alignés sur page.tsx */}
				<div className="bg-background pt-[calc(var(--navbar-height-static)+0.75rem)] pb-6 sm:pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<BreadcrumbNavSkeleton className="pb-5" />

						<article className="space-y-12">
							<ProductMainSkeleton />

							{/* RelatedProducts Skeleton — il porte son propre séparateur
							    d'ouverture, comme la section qu'il double. */}
							<RelatedProductsSkeleton limit={4} />
						</article>
					</div>
				</div>
			</div>
		</div>
	);
}
