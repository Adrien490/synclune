import { SECTION_SPACING } from "@/shared/constants/spacing";

interface LatestCreationsSkeletonProps {
	/** Nombre de produits à afficher dans la grille */
	productsCount?: number;
}

/**
 * Skeleton de chargement pour LatestCreations (grille)
 * Affiche un etat de chargement structure pendant le streaming SSR
 *
 * Reproduit exactement la structure de LatestCreations pour eviter
 * les layout shifts lors du chargement (CLS optimization)
 *
 * @param productsCount - Nombre de produits dans la grille (par defaut: 4)
 *
 * @example
 * ```tsx
 * <Suspense fallback={<LatestCreationsSkeleton />}>
 *   <LatestCreations productsPromise={productsPromise} />
 * </Suspense>
 * ```
 */
export function LatestCreationsSkeleton({ productsCount = 4 }: LatestCreationsSkeletonProps = {}) {
	return (
		<section
			className={`bg-background relative overflow-hidden ${SECTION_SPACING.section}`}
			aria-label="Chargement des dernières créations"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="mb-8 text-center lg:mb-12">
					{/* Titre skeleton - "Nouveaux bijoux" */}
					<div className="bg-muted mx-auto h-10 w-64 rounded motion-safe:animate-pulse" />
					{/* Sous-titre skeleton */}
					<div className="bg-muted/50 mx-auto mt-4 h-7 w-full max-w-md rounded motion-safe:animate-pulse" />
				</header>

				<LatestCreationsGridSkeleton productsCount={productsCount} />
			</div>
		</section>
	);
}

/**
 * Grid-only skeleton for the inner Suspense boundary in LatestCreations.
 * Used when the header is already rendered and only the grid is loading.
 */
export function LatestCreationsGridSkeleton({
	productsCount = 4,
}: LatestCreationsSkeletonProps = {}) {
	return (
		<>
			<div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-6 lg:mb-12 lg:grid-cols-4 lg:gap-8">
				{Array.from({ length: productsCount }).map((_, i) => (
					<div
						key={i}
						className="bg-card overflow-hidden rounded-lg border-2 border-transparent shadow-sm"
					>
						<div className="bg-muted aspect-3/4 motion-safe:animate-pulse sm:aspect-4/5" />

						{/* Content padding */}
						<div className="space-y-2 p-4">
							{/* Title skeleton */}
							<div className="bg-muted h-6 rounded motion-safe:animate-pulse" />

							{/* Price skeleton */}
							<div className="bg-muted h-5 w-20 rounded motion-safe:animate-pulse" />
						</div>
					</div>
				))}
			</div>

			{/* CTA skeleton */}
			<div className="text-center">
				<div className="bg-muted mx-auto h-12 w-64 rounded-md shadow-lg motion-safe:animate-pulse" />
			</div>
		</>
	);
}
