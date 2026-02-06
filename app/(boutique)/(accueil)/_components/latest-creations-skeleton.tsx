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
export function LatestCreationsSkeleton({
	productsCount = 4,
}: LatestCreationsSkeletonProps = {}) {
	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-label="Chargement des dernières créations"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="mb-8 text-center lg:mb-12">
					{/* Titre skeleton - "Nouveaux bijoux" */}
					<div className="h-10 w-64 mx-auto bg-muted animate-pulse rounded" />
					{/* Sous-titre skeleton */}
					<div className="mt-4 h-7 w-full max-w-md mx-auto bg-muted/50 animate-pulse rounded" />
				</header>

				{/* Grid skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12">
					{Array.from({ length: productsCount }).map((_, i) => (
						<div key={i} className="bg-card rounded-lg border-2 border-transparent shadow-sm overflow-hidden">
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
					))}
				</div>

				{/* CTA skeleton */}
				<div className="text-center">
					<div className="h-12 w-64 mx-auto bg-muted animate-pulse rounded-md shadow-lg" />
				</div>
			</div>
		</section>
	);
}
