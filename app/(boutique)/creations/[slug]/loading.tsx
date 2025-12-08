import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for product detail page
 * Structure exacte : PageHeader → Gallery + ProductInfo/ProductDetails → RelatedProducts
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

				{/* Main Content - pt-20 sur mobile pour compenser l'absence de PageHeader */}
				<div className="bg-background pt-20 pb-12 sm:py-12 lg:py-16">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
						<article className="space-y-12">
							{/* Product Content Grid - Gallery sticky on desktop */}
							<div className="grid gap-6 lg:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
								{/* Gallery Section - Left (sticky on desktop) */}
								<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
									{/* Grid layout matching gallery.tsx */}
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
										<div className="relative aspect-square overflow-hidden rounded-2xl lg:rounded-3xl bg-muted/30 order-2">
											<Skeleton className="absolute inset-0 from-muted/60 via-muted/40 to-transparent" />
											<div className="absolute inset-0 flex items-center justify-center">
												<div className="h-16 w-16 rounded-full border-4 border-muted/60 border-t-primary/40 animate-spin" />
											</div>
										</div>
									</div>

									{/* Thumbnails horizontales - Mobile uniquement */}
									<div className="lg:hidden mt-4 sm:mt-6">
										<div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
											{Array.from({ length: 4 }).map((_, i) => (
												<Skeleton
													key={i}
													className="aspect-square rounded-lg bg-muted/40"
												/>
											))}
										</div>
									</div>
								</section>

								{/* Product Info + Details Section - Right (scrollable) */}
								<section className="space-y-6 lg:min-h-screen">
									{/* ===== 1. ProductInfo ===== */}
									{/* Titre avec bouton wishlist */}
									<div className="space-y-4">
										<div className="flex items-start justify-between gap-3">
											<Skeleton className="h-10 sm:h-12 flex-1 bg-muted/50" />
											<Skeleton className="h-10 w-10 rounded-full bg-muted/30 shrink-0" />
										</div>

										{/* Badges (type + collections) */}
										<div className="flex flex-wrap items-center gap-2">
											<Skeleton className="h-7 w-24 rounded-full bg-muted/30" />
											<Skeleton className="h-7 w-28 rounded-full bg-muted/30" />
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

									{/* ===== 2. ProductDetails ===== */}
									{/* Prix */}
									<div className="space-y-2">
										<Skeleton className="h-10 w-32 bg-primary/20" />
										<Skeleton className="h-4 w-48 bg-muted/30" />
									</div>

									{/* Caractéristiques */}
									<div className="space-y-3">
										{Array.from({ length: 3 }).map((_, i) => (
											<div
												key={i}
												className="flex justify-between items-center"
											>
												<Skeleton className="h-4 w-24 bg-muted/40" />
												<Skeleton className="h-4 w-32 bg-muted/50" />
											</div>
										))}
									</div>

									{/* Separator */}
									<div className="h-px bg-border" />

									{/* Sélecteurs de variantes */}
									<div className="space-y-4">
										{/* Couleur */}
										<div className="space-y-3">
											<Skeleton className="h-4 w-24 bg-muted/30" />
											<div className="flex gap-2">
												{Array.from({ length: 5 }).map((_, i) => (
													<Skeleton
														key={i}
														className="h-10 w-10 rounded-full bg-muted/40"
													/>
												))}
											</div>
										</div>

										{/* Matériau */}
										<div className="space-y-3">
											<Skeleton className="h-4 w-28 bg-muted/30" />
											<div className="flex gap-2 flex-wrap">
												{Array.from({ length: 3 }).map((_, i) => (
													<Skeleton
														key={i}
														className="h-10 w-24 rounded-lg bg-muted/40"
													/>
												))}
											</div>
										</div>
									</div>

									{/* CTA Panier */}
									<div className="space-y-4">
										<div className="flex items-center gap-4">
											<Skeleton className="h-12 w-32 bg-muted/40" />
											<Skeleton className="h-12 flex-1 bg-primary/20" />
										</div>
									</div>

									{/* Disponibilité */}
									<div className="flex items-center gap-2">
										<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
										<Skeleton className="h-4 w-32 bg-muted/30" />
									</div>

									{/* Separator */}
									<div className="h-px bg-border" />

									{/* Entretien */}
									<div className="space-y-4">
										<Skeleton className="h-6 w-48 bg-muted/40" />
										<Skeleton className="h-4 w-full bg-muted/30" />
										<Skeleton className="h-4 w-3/4 bg-muted/30" />
									</div>
								</section>
							</div>

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
