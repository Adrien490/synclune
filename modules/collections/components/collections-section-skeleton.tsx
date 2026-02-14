import { SECTION_SPACING } from "@/shared/constants/spacing";

interface CollectionsSectionSkeletonProps {
	/** Nombre de collections à afficher */
	collectionsCount?: number;
}

/**
 * Skeleton de chargement pour la section Collections
 * Affiche un etat de chargement structure pendant le streaming SSR
 *
 * Reproduit exactement la structure de Collections pour eviter
 * les layout shifts lors du chargement (CLS optimization)
 *
 * @param collectionsCount - Nombre de collections dans le carousel (par defaut: 5)
 *
 * @example
 * ```tsx
 * <Suspense fallback={<CollectionsSectionSkeleton />}>
 *   <Collections collectionsPromise={collectionsPromise} />
 * </Suspense>
 * ```
 */
export function CollectionsSectionSkeleton({
	collectionsCount = 5,
}: CollectionsSectionSkeletonProps = {}) {
	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-label="Chargement des collections"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton - structure alignée avec Collections réel */}
				<header className="mb-8 text-center lg:mb-12">
					{/* Titre skeleton - "Dernières collections" */}
					<div className="h-10 w-64 mx-auto bg-muted animate-pulse rounded" />
					{/* Sous-titre skeleton */}
					<div className="mt-4 h-7 w-full max-w-2xl mx-auto bg-muted/50 animate-pulse rounded" />
				</header>

				{/* Carousel skeleton - structure alignée avec Collections réel */}
				<div className="mb-8 lg:mb-12 -mx-4 sm:-mx-6 lg:-mx-8">
					<div className="flex gap-4 sm:gap-6 overflow-hidden pb-4 px-4 sm:px-6 lg:px-8">
						{Array.from({ length: collectionsCount }).map((_, i) => (
							<div
								key={i}
								className="w-[clamp(200px,72vw,280px)] md:w-1/3 lg:w-1/4 snap-center"
							>
								{/* Card skeleton */}
								<div className="bg-card rounded-xl border shadow-sm overflow-hidden">
									{/* Image skeleton - aspect-square pour correspondre au CollectionCard */}
									<div className="aspect-square bg-muted animate-pulse" />

									{/* Contenu avec padding */}
									<div className="p-4 space-y-2">
										{/* Titre skeleton */}
										<div className="h-6 bg-muted rounded animate-pulse" />
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* CTA skeleton */}
				<div className="text-center">
					<div className="h-12 w-56 mx-auto bg-muted animate-pulse rounded-md shadow-lg" />
				</div>
			</div>
		</section>
	);
}
