import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { RecentlyViewedProductsSkeleton } from "@/modules/products/components/recently-viewed-products-skeleton";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
import { ProductReviewsSectionSkeleton } from "@/modules/reviews/components/product-reviews-section";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for product detail page
 * Structure exacte : PageHeader → Gallery + ProductInfo/ProductDetails → Reviews → RecentlyViewed → Related
 *
 * IMPORTANT: L'ordre des composants doit correspondre exactement à page.tsx pour éviter le CLS
 * ProductInfo: Titre → ReviewRatingLink → Badge type → WishlistButton
 * ProductDetails: Prix → VariantSelector → AddToCart → Reassurance → Characteristics → Highlights → Description → CareInfo
 */
export default function ProductDetailLoading() {
	return (
		<div
			className="relative min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement du produit"
		>
			<span className="sr-only">Chargement du produit...</span>

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
							{/* Product Content Grid - Gallery sticky on desktop */}
							<div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
								{/* Gallery Section - Left (sticky on desktop) */}
								<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
									{/* Grid layout matching gallery.tsx */}
									<div className="grid grid-cols-1 gap-3 md:grid-cols-[60px_1fr] md:gap-4 lg:grid-cols-[80px_1fr]">
										{/* Thumbnails verticales - Desktop uniquement */}
										<div className="order-1 hidden max-h-[min(500px,60vh)] overflow-y-auto md:block">
											<div className="flex flex-col gap-2">
												{Array.from({ length: 4 }).map((_, i) => (
													<Skeleton key={i} className="bg-muted/40 h-20 w-20 rounded-lg" />
												))}
											</div>
										</div>

										{/* Main image */}
										<div className="bg-muted/30 relative order-2 aspect-3/4 overflow-hidden rounded-2xl sm:aspect-4/5 sm:rounded-3xl">
											<Skeleton className="from-muted/60 via-muted/40 absolute inset-0 to-transparent" />
											<div className="absolute inset-0 flex items-center justify-center">
												<div className="border-muted/60 border-t-primary/40 h-16 w-16 animate-spin rounded-full border-4" />
											</div>
											{/* GalleryCounter skeleton */}
											<div className="absolute top-3 right-3">
												<Skeleton className="bg-muted/60 h-6 w-12 rounded-full" />
											</div>
										</div>

										{/* Thumbnails horizontales - Mobile uniquement */}
										<div className="order-3 mt-3 md:hidden">
											<div className="flex flex-wrap gap-2">
												{Array.from({ length: 4 }).map((_, i) => (
													<Skeleton key={i} className="bg-muted/40 h-14 w-14 shrink-0 rounded-lg" />
												))}
											</div>
										</div>
									</div>
								</section>

								{/* Product Info + Details Section - Right (scrollable) */}
								<section className="space-y-6 lg:min-h-screen">
									{/* ===== 1. ProductInfo ===== */}
									<div className="space-y-4">
										{/* Titre avec bouton wishlist - Mobile uniquement (sm:hidden) */}
										<div className="flex items-start justify-between gap-4 sm:hidden">
											<div className="flex-1 space-y-2">
												<Skeleton className="bg-muted/50 h-9 w-full" />
												<Skeleton className="bg-muted/50 h-9 w-3/4" />
											</div>
											<Skeleton className="bg-muted/30 h-10 w-10 shrink-0 rounded-full" />
										</div>

										{/* ReviewRatingLink - Mobile (sm:hidden) */}
										<Skeleton className="bg-muted/30 h-5 w-28 sm:hidden" />

										{/* Badges (type + ReviewRatingLink desktop + wishlist desktop) */}
										<div className="flex flex-wrap items-center gap-2">
											<Skeleton className="bg-muted/30 h-7 w-24 rounded-full" />
											{/* ReviewRatingLink - Desktop uniquement */}
											<Skeleton className="bg-muted/30 hidden h-5 w-28 sm:block" />
											{/* Bouton wishlist - Desktop uniquement, aligné à droite */}
											<Skeleton className="bg-muted/30 ml-auto hidden h-10 w-10 rounded-full sm:block" />
										</div>
									</div>

									{/* Separator (entre ProductInfo et ProductDetails) */}
									<div className="bg-border h-px" />

									{/* ===== 2. ProductPriceDisplay ===== */}
									<div className="space-y-3">
										{/* Prix */}
										<div className="flex items-baseline gap-3">
											<Skeleton className="bg-primary/20 h-10 w-28" />
										</div>
										{/* Badge disponibilité */}
										<Skeleton className="bg-muted/30 h-6 w-24 rounded-full" />
									</div>

									{/* ===== 3. VariantSelector - Card ===== */}
									{/* Note: Affiché même si certains produits mono-SKU ne l'affichent pas (worst case) */}
									<div className="border-primary/20 rounded-xl border-2 shadow-sm">
										{/* CardHeader */}
										<div className="space-y-2 p-6 pb-0">
											<div className="flex items-center gap-2">
												<Skeleton className="bg-primary/30 h-4 w-4" />
												<Skeleton className="bg-muted/40 h-5 w-44" />
											</div>
											<Skeleton className="bg-muted/30 h-4 w-64" />
										</div>
										{/* CardContent */}
										<div className="space-y-6 p-6">
											{/* Couleurs - 52px mobile / 44px desktop comme ColorSelector */}
											<div className="space-y-3">
												<Skeleton className="bg-muted/30 h-4 w-20" />
												<div className="flex flex-wrap gap-3">
													{Array.from({ length: 4 }).map((_, i) => (
														<Skeleton
															key={i}
															className="bg-muted/40 h-13 w-13 rounded-full sm:h-11 sm:w-11"
														/>
													))}
												</div>
											</div>

											<div className="bg-border h-px" />

											{/* Matériaux */}
											<div className="space-y-3">
												<Skeleton className="bg-muted/30 h-4 w-24" />
												<div className="grid grid-cols-2 gap-2">
													{Array.from({ length: 2 }).map((_, i) => (
														<Skeleton key={i} className="bg-muted/40 h-10 rounded-lg" />
													))}
												</div>
											</div>

											<div className="bg-border h-px" />

											{/* Tailles - grid responsive comme SizeSelector */}
											<div className="space-y-3">
												<Skeleton className="bg-muted/30 h-4 w-16" />
												<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-2">
													{Array.from({ length: 4 }).map((_, i) => (
														<Skeleton key={i} className="bg-muted/40 h-12 rounded-lg sm:h-11" />
													))}
												</div>
											</div>
										</div>
									</div>

									{/* ===== 4. AddToCartForm (monté avant Reassurance - Baymard) ===== */}
									<Skeleton className="bg-primary/30 h-12 w-full rounded-lg" />

									{/* ===== 5. ProductReassurance - Trust icons (après CTA) ===== */}
									<ul className="space-y-1.5">
										{Array.from({ length: 3 }).map((_, i) => (
											<li key={i} className="flex items-center gap-2">
												<Skeleton className="bg-muted/30 h-4 w-4 shrink-0 rounded" />
												<Skeleton className="bg-muted/30 h-4 w-48" />
											</li>
										))}
									</ul>

									{/* ===== 6. ProductCharacteristics - Card ===== */}
									<div className="bg-muted/30 rounded-xl border-transparent">
										{/* CardHeader */}
										<div className="space-y-2 p-6 pb-0">
											<Skeleton className="bg-muted/40 h-4 w-36" />
											<Skeleton className="bg-muted/30 h-4 w-52" />
										</div>
										{/* CardContent - Simple size display */}
										<div className="space-y-3 p-6 pt-4">
											<div className="bg-muted/50 rounded-lg p-2">
												<Skeleton className="bg-muted/40 h-5 w-32" />
											</div>
										</div>
									</div>

									{/* Separator */}
									<div className="bg-border h-px" />

									{/* ===== 7. ProductHighlights ===== */}
									<ul className="grid gap-4 sm:grid-cols-2">
										{Array.from({ length: 4 }).map((_, i) => (
											<li key={i} className="flex items-start gap-2">
												<span className="text-primary mt-1" aria-hidden="true">
													•
												</span>
												<div className="min-w-0 space-y-1">
													<Skeleton className="bg-muted/40 h-5 w-32" />
													<Skeleton className="bg-muted/30 h-4 w-44" />
												</div>
											</li>
										))}
									</ul>

									{/* ===== 8. Product description ===== */}
									<div className="max-w-prose space-y-3">
										<Skeleton className="bg-muted/30 h-5 w-full" />
										<Skeleton className="bg-muted/30 h-5 w-full" />
										<Skeleton className="bg-muted/30 h-5 w-3/4" />
									</div>

									{/* ===== 9. ProductCareInfo - Accordion fermé ===== */}
									<div className="space-y-0">
										{/* Accordion Item 1 - Livraison */}
										<div className="border-b py-4">
											<div className="flex items-center gap-2">
												<Skeleton className="bg-primary/30 h-4 w-4" />
												<Skeleton className="bg-muted/40 h-5 w-20" />
											</div>
										</div>
										{/* Accordion Item 2 - Entretien */}
										<div className="border-b py-4">
											<div className="flex items-center gap-2">
												<Skeleton className="bg-primary/30 h-4 w-4" />
												<Skeleton className="bg-muted/40 h-5 w-20" />
											</div>
										</div>
									</div>
								</section>
							</div>

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
							<RelatedProductsSkeleton limit={8} />
						</article>
					</div>
				</div>
			</div>
		</div>
	);
}
