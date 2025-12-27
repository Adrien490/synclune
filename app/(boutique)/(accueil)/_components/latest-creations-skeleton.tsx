import { SECTION_SPACING } from "@/shared/constants/spacing";

interface LatestCreationsSkeletonProps {
	/** Nombre de produits à afficher dans le carousel */
	productsCount?: number;
}

/**
 * Skeleton de chargement pour LatestCreations (carousel)
 * Affiche un etat de chargement structure pendant le streaming SSR
 *
 * Reproduit exactement la structure de LatestCreations pour eviter
 * les layout shifts lors du chargement (CLS optimization)
 *
 * @param productsCount - Nombre de produits dans le carousel (par defaut: 6)
 *
 * @example
 * ```tsx
 * <Suspense fallback={<LatestCreationsSkeleton />}>
 *   <LatestCreations productsPromise={productsPromise} />
 * </Suspense>
 * ```
 */
export function LatestCreationsSkeleton({
	productsCount = 6,
}: LatestCreationsSkeletonProps = {}) {
	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-label="Chargement des dernières créations"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="mb-8 text-center lg:mb-12">
					{/* Titre skeleton - "Les dernières créations" */}
					<div className="h-10 w-72 mx-auto bg-muted animate-pulse rounded" />
					{/* Sous-titre skeleton */}
					<div className="mt-4 h-7 w-full max-w-md mx-auto bg-muted/50 animate-pulse rounded" />
				</header>

				{/* Carousel skeleton */}
				<div className="mb-8 lg:mb-12 -mx-4 sm:-mx-6 lg:-mx-8">
					<div className="flex gap-3 sm:gap-4 lg:gap-6 overflow-hidden pb-4 px-4 sm:px-6 lg:px-8">
						{Array.from({ length: productsCount }).map((_, i) => (
							<div
								key={i}
								className="shrink-0 w-[clamp(160px,45vw,200px)] sm:w-1/3 lg:w-1/4"
							>
								{/* ProductCard skeleton */}
								<div className="bg-card rounded-lg border-2 border-transparent shadow-sm overflow-hidden">
									{/* Image skeleton - aspect-4/5 pour correspondre au ProductCard */}
									<div className="aspect-4/5 bg-muted animate-pulse" />

									{/* Contenu avec padding */}
									<div className="p-4 space-y-2">
										{/* Titre skeleton */}
										<div className="h-6 bg-muted rounded animate-pulse" />

										{/* Prix skeleton */}
										<div className="h-5 w-20 bg-muted rounded animate-pulse" />
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* CTA skeleton */}
				<div className="text-center">
					<div className="h-12 w-64 mx-auto bg-muted animate-pulse rounded-md shadow-lg" />
				</div>
			</div>
		</section>
	);
}
