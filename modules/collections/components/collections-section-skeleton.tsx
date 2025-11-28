import { SECTION_SPACING } from "@/shared/constants/spacing";
import { Palette } from "lucide-react";

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
			className={`relative overflow-hidden bg-gradient-to-b from-pink-50/30 via-background to-background ${SECTION_SPACING.default}`}
			aria-label="Chargement des collections"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="mb-8 text-center lg:mb-12">
					<div className="flex items-center justify-center gap-2 mb-2">
						<Palette
							className="w-6 h-6 text-secondary/30 animate-pulse"
							aria-hidden="true"
						/>
						{/* Titre skeleton - ajuste pour "Dernieres collections" */}
						<div className="h-10 w-64 bg-muted animate-pulse rounded" />
						<Palette
							className="w-6 h-6 text-secondary/30 animate-pulse"
							aria-hidden="true"
						/>
					</div>
					{/* Sous-titre skeleton */}
					<div className="mt-4 h-7 w-full max-w-2xl mx-auto bg-muted/50 animate-pulse rounded" />
				</header>

				{/* Carousel skeleton */}
				<div className="mb-8 lg:mb-12">
					<div className="flex gap-4 sm:gap-6 overflow-hidden pb-4">
						{Array.from({ length: collectionsCount }).map((_, i) => (
							<div
								key={i}
								className={`shrink-0 w-[280px] ${
									i === 0 ? "ml-[calc(50vw-140px)] sm:ml-6 lg:ml-8" : ""
								} ${
									i === collectionsCount - 1
										? "mr-[calc(50vw-140px)] sm:mr-6 lg:mr-8"
										: ""
								}`}
							>
								{/* Card skeleton */}
								<div className="bg-card rounded-lg border shadow-sm overflow-hidden">
									{/* Image skeleton - aspect-4/3 pour correspondre au CollectionCard */}
									<div className="aspect-4/3 bg-muted animate-pulse" />

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
