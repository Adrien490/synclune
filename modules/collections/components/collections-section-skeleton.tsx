import { cn } from "@/shared/utils/cn";
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
			className={cn("bg-background relative overflow-hidden", SECTION_SPACING.section)}
			aria-label="Chargement des collections"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton - structure alignée avec Collections réel */}
				<header className="mb-8 text-center lg:mb-12">
					{/* Titre skeleton - "Dernières collections" */}
					<div className="bg-muted mx-auto h-10 w-64 rounded motion-safe:animate-pulse" />
					{/* Sous-titre skeleton */}
					<div className="bg-muted/50 mx-auto mt-4 h-7 w-full max-w-2xl rounded motion-safe:animate-pulse" />
				</header>

				{/* Carousel skeleton - structure alignée avec Collections réel */}
				<div className="-mx-4 mb-8 sm:-mx-6 lg:-mx-8 lg:mb-12">
					<div className="flex gap-4 overflow-hidden px-4 pb-4 sm:gap-6 sm:px-6 lg:px-8">
						{Array.from({ length: collectionsCount }).map((_, i) => (
							<div key={i} className="w-[clamp(200px,72vw,280px)] snap-center md:w-1/3 lg:w-1/4">
								{/* Card skeleton */}
								<div className="bg-card overflow-hidden rounded-xl border shadow-sm">
									{/* Image skeleton - aspect-square pour correspondre au CollectionCard */}
									<div className="bg-muted aspect-square motion-safe:animate-pulse" />

									{/* Contenu avec padding */}
									<div className="space-y-2 p-4">
										{/* Titre skeleton */}
										<div className="bg-muted h-6 rounded motion-safe:animate-pulse" />
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* CTA skeleton */}
				<div className="text-center">
					<div className="bg-muted mx-auto h-12 w-56 rounded-md shadow-lg motion-safe:animate-pulse" />
				</div>
			</div>
		</section>
	);
}
