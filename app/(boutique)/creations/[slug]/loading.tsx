import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for product detail page
 * Covers: ParticleSystem, PageHeader, Gallery (sticky), ProductInfo, ProductConfigurator
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
				{/* Page Header Skeleton - Uses PageHeader component */}
				<div className="pt-16 sm:pt-20">
					<section className="bg-background border-b border-border">
						<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
							<div className="space-y-2">
								{/* Breadcrumbs */}
								<nav className="text-sm">
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-16 bg-muted/40" />
										<span className="text-muted-foreground">/</span>
										<Skeleton className="h-4 w-20 bg-muted/40" />
										<span className="text-muted-foreground">/</span>
										<Skeleton className="h-4 w-24 bg-muted/40" />
										<span className="text-muted-foreground">/</span>
										<Skeleton className="h-4 w-32 bg-muted/50" />
									</div>
								</nav>

								{/* Title */}
								<Skeleton className="h-8 sm:h-9 w-64 sm:w-96 bg-muted/50" />
							</div>
						</div>
					</section>
				</div>

				{/* Main Content */}
				<div className="bg-background py-8">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
						<article className="space-y-12">
							{/* Product Content Grid - Gallery sticky on desktop */}
							<div className="grid gap-6 lg:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
								{/* Gallery Section - Left (sticky on desktop) */}
								<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit">
									<div className="space-y-4">
										{/* Main image */}
										<div className="relative aspect-square overflow-hidden rounded-xl bg-muted/30 lg:rounded-2xl">
											<Skeleton className="absolute inset-0 from-muted/60 via-muted/40 to-transparent" />
											<div className="absolute inset-0 flex items-center justify-center">
												<div className="h-16 w-16 rounded-full border-4 border-muted/60 border-t-primary/40 animate-spin" />
											</div>
										</div>

										{/* Thumbnails */}
										<div className="flex gap-3 overflow-x-auto pb-2">
											{Array.from({ length: 4 }).map((_, i) => (
												<Skeleton
													key={i}
													className="shrink-0 h-20 w-20 rounded-lg bg-muted/40"
												/>
											))}
										</div>
									</div>
								</section>

								{/* Product Info Section - Right (scrollable) */}
								<section className="space-y-6 lg:min-h-screen">
									{/* Price */}
									<div className="space-y-2">
										<Skeleton className="h-10 w-32 bg-primary/20" />
										<Skeleton className="h-4 w-48 bg-muted/30" />
									</div>

									{/* Description */}
									<div className="space-y-2">
										<Skeleton className="h-5 w-24 bg-muted/40" />
										<Skeleton className="h-20 w-full bg-muted/30" />
									</div>

									{/* Product Details */}
									<div className="space-y-4 pt-4 border-t border-border">
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

									{/* Customization Options */}
									<div className="space-y-4 pt-4">
										<Skeleton className="h-5 w-32 bg-muted/40" />

										{/* Color selector */}
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

										{/* Material selector */}
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

									{/* Quantity & Add to Cart */}
									<div className="space-y-4 pt-6">
										<div className="flex items-center gap-4">
											<Skeleton className="h-12 w-32 bg-muted/40" />
											<Skeleton className="h-12 flex-1 bg-primary/20" />
										</div>
										<Skeleton className="h-12 w-full bg-muted/30" />
									</div>

									{/* Availability */}
									<div className="flex items-center gap-2 pt-2">
										<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
										<Skeleton className="h-4 w-32 bg-muted/30" />
									</div>

									{/* Separator */}
									<div className="h-px bg-border" />

									{/* Configurator placeholder */}
									<div className="space-y-4">
										<Skeleton className="h-6 w-48 bg-muted/40" />
										<Skeleton className="h-4 w-full bg-muted/30" />
										<Skeleton className="h-4 w-3/4 bg-muted/30" />
									</div>
								</section>
							</div>

						</article>
					</div>
				</div>
			</div>
		</div>
	);
}
