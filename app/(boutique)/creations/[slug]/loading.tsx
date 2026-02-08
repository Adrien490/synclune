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
 * ProductInfo: Titre → Prix mobile → Badge type → Description
 * ProductDetails: Prix → VariantSelector → AddToCart → Reassurance → Characteristics → CareInfo
 */
export default function ProductDetailLoading() {
	return (
		<div
			className="min-h-screen relative"
			role="status"
			aria-busy="true"
			aria-label="Chargement du produit"
		>
			<span className="sr-only">Chargement du produit...</span>

			{/* Particle system placeholder */}
			<div
				className="fixed inset-0 z-0 from-primary/5 via-transparent to-secondary/5"
				aria-hidden="true"
			/>

			<div className="relative z-10">
				{/* PageHeader Skeleton - Caché sur mobile comme le vrai PageHeader */}
				<PageHeaderSkeleton hasDescription={false} className="hidden sm:block" />

				{/* Main Content - Paddings alignés sur page.tsx */}
				<div className="bg-background pt-20 pb-6 sm:pt-4 sm:pb-12 lg:pt-6 lg:pb-16">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
						<article className="space-y-12">
							{/* Product Content Grid - Gallery sticky on desktop */}
							<div className="grid gap-6 lg:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
								{/* Gallery Section - Left (sticky on desktop) */}
								<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
									{/* Grid layout matching gallery.tsx - affiché avec thumbnails (worst case) */}
									<div className="grid gap-3 lg:gap-4 grid-cols-1 lg:grid-cols-[80px_1fr]">
										{/* Thumbnails verticales - Desktop uniquement */}
										<div className="hidden lg:flex flex-col gap-2 order-1 max-h-[min(500px,60vh)] overflow-y-auto">
											{Array.from({ length: 4 }).map((_, i) => (
												<Skeleton
													key={i}
													className="h-20 w-20 rounded-lg bg-muted/40"
												/>
											))}
										</div>

										{/* Main image */}
										<div className="relative aspect-3/4 sm:aspect-4/5 overflow-hidden rounded-2xl sm:rounded-3xl bg-muted/30 order-2">
											<Skeleton className="absolute inset-0 from-muted/60 via-muted/40 to-transparent" />
											<div className="absolute inset-0 flex items-center justify-center">
												<div className="h-16 w-16 rounded-full border-4 border-muted/60 border-t-primary/40 animate-spin" />
											</div>
											{/* GalleryCounter skeleton */}
											<div className="absolute top-3 right-3">
												<Skeleton className="h-6 w-12 rounded-full bg-muted/60" />
											</div>
										</div>

										{/* Thumbnails horizontales - Mobile uniquement */}
										<div className="flex gap-2 overflow-x-auto py-2 lg:hidden order-3">
											{Array.from({ length: 4 }).map((_, i) => (
												<Skeleton
													key={i}
													className="h-16 w-16 shrink-0 rounded-lg bg-muted/40"
												/>
											))}
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
												<Skeleton className="h-9 w-full bg-muted/50" />
												<Skeleton className="h-9 w-3/4 bg-muted/50" />
											</div>
											<Skeleton className="h-10 w-10 rounded-full bg-muted/30 shrink-0" />
										</div>

										{/* Prix compact - Mobile uniquement (sm:hidden) */}
										<div className="sm:hidden">
											<Skeleton className="h-8 w-24 bg-muted/50" />
										</div>

										{/* Badges (type + wishlist desktop) */}
										<div className="flex flex-wrap items-center gap-2">
											<Skeleton className="h-7 w-24 rounded-full bg-muted/30" />
											{/* Bouton wishlist - Desktop uniquement, aligné à droite */}
											<Skeleton className="hidden sm:block h-10 w-10 rounded-full bg-muted/30 ml-auto" />
										</div>

										{/* Description */}
										<div className="space-y-2">
											<Skeleton className="h-5 w-full bg-muted/30" />
											<Skeleton className="h-5 w-full bg-muted/30" />
											<Skeleton className="h-5 w-3/4 bg-muted/30" />
										</div>
									</div>

									{/* Separator (entre ProductInfo et ProductDetails) */}
									<div className="h-px bg-border" />

									{/* ===== 2. ProductPriceDisplay - Card ===== */}
									<div className="rounded-xl border border-primary/10 shadow-sm">
										<div className="p-6 space-y-3">
											{/* Prix */}
											<div className="flex items-baseline gap-3">
												<Skeleton className="h-10 w-28 bg-primary/20" />
											</div>
											{/* Badge disponibilité */}
											<Skeleton className="h-6 w-24 rounded-full bg-muted/30" />
										</div>
									</div>

									{/* ===== 3. VariantSelector - Card ===== */}
									{/* Note: Affiché même si certains produits mono-SKU ne l'affichent pas (worst case) */}
									<div className="rounded-xl border-2 border-primary/20 shadow-sm">
										{/* CardHeader */}
										<div className="p-6 pb-0 space-y-2">
											<div className="flex items-center gap-2">
												<Skeleton className="h-4 w-4 bg-primary/30" />
												<Skeleton className="h-5 w-44 bg-muted/40" />
											</div>
											<Skeleton className="h-4 w-64 bg-muted/30" />
										</div>
										{/* CardContent */}
										<div className="p-6 space-y-6">
											{/* Couleurs - 52px mobile / 44px desktop comme ColorSelector */}
											<div className="space-y-3">
												<Skeleton className="h-4 w-20 bg-muted/30" />
												<div className="flex flex-wrap gap-3">
													{Array.from({ length: 4 }).map((_, i) => (
														<Skeleton
															key={i}
															className="h-13 w-13 sm:h-11 sm:w-11 rounded-full bg-muted/40"
														/>
													))}
												</div>
											</div>

											<div className="h-px bg-border" />

											{/* Matériaux */}
											<div className="space-y-3">
												<Skeleton className="h-4 w-24 bg-muted/30" />
												<div className="grid grid-cols-2 gap-2">
													{Array.from({ length: 2 }).map((_, i) => (
														<Skeleton
															key={i}
															className="h-10 rounded-lg bg-muted/40"
														/>
													))}
												</div>
											</div>

											<div className="h-px bg-border" />

											{/* Tailles - grid responsive comme SizeSelector */}
											<div className="space-y-3">
												<Skeleton className="h-4 w-16 bg-muted/30" />
												<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-2">
													{Array.from({ length: 4 }).map((_, i) => (
														<Skeleton
															key={i}
															className="h-12 sm:h-11 rounded-lg bg-muted/40"
														/>
													))}
												</div>
											</div>
										</div>
									</div>

									{/* ===== 4. AddToCartForm (monté avant Reassurance - Baymard) ===== */}
									<Skeleton className="h-12 w-full rounded-lg bg-primary/30" />

									{/* ===== 5. ProductReassurance - Trust icons (après CTA) ===== */}
									<ul className="space-y-1.5">
										{Array.from({ length: 3 }).map((_, i) => (
											<li key={i} className="flex items-center gap-2">
												<Skeleton className="h-4 w-4 shrink-0 rounded bg-muted/30" />
												<Skeleton className="h-4 w-48 bg-muted/30" />
											</li>
										))}
									</ul>

									{/* ===== 6. ProductCharacteristics - Card ===== */}
									<div className="rounded-xl border-transparent bg-muted/30">
										{/* CardHeader */}
										<div className="p-6 pb-0 space-y-2">
											<div className="flex items-center gap-2">
												<Skeleton className="h-4 w-4 rounded-full bg-primary/30" />
												<Skeleton className="h-4 w-32 bg-muted/40" />
											</div>
											<Skeleton className="h-4 w-40 bg-muted/30" />
										</div>
										{/* CardContent - Grille 2 colonnes avec 2 items */}
										<div className="p-6 pt-4">
											<div className="grid gap-5 sm:gap-4 sm:grid-cols-2">
												{Array.from({ length: 2 }).map((_, i) => (
													<div key={i} className="flex items-center gap-3">
														<Skeleton className="shrink-0 w-8 h-8 rounded-full bg-primary/10" />
														<div className="space-y-1.5 flex-1">
															<Skeleton className="h-4 w-24 bg-muted/40" />
															<Skeleton className="h-3 w-20 bg-muted/30" />
														</div>
													</div>
												))}
											</div>
										</div>
									</div>

									{/* Separator */}
									<div className="h-px bg-border" />

									{/* ===== 7. ProductCareInfo - Accordion fermé ===== */}
									<div className="space-y-0">
										{/* Accordion Item 1 - Livraison */}
										<div className="border-b py-4">
											<div className="flex items-center gap-2">
												<Skeleton className="h-4 w-4 bg-primary/30" />
												<Skeleton className="h-5 w-20 bg-muted/40" />
											</div>
										</div>
										{/* Accordion Item 2 - Entretien */}
										<div className="border-b py-4">
											<div className="flex items-center gap-2">
												<Skeleton className="h-4 w-4 bg-primary/30" />
												<Skeleton className="h-5 w-20 bg-muted/40" />
											</div>
										</div>
									</div>
								</section>
							</div>

							{/* Separator avant avis clients */}
							<div className="h-px bg-border" />

							{/* ProductReviewsSection Skeleton */}
							<ProductReviewsSectionSkeleton />

							{/* Separator avant produits recemment vus */}
							<div className="h-px bg-border" />

							{/* RecentlyViewedProducts Skeleton */}
							<RecentlyViewedProductsSkeleton limit={4} />

							{/* Separator avant produits similaires */}
							<div className="h-px bg-border" />

							{/* RelatedProducts Skeleton */}
							<RelatedProductsSkeleton limit={8} />
						</article>
					</div>
				</div>
			</div>
		</div>
	);
}
