import { SECTION_SPACING } from "@/shared/constants/spacing";

interface CuratedPicksSkeletonProps {
	/** Nombre de produits à afficher dans la grille */
	productsCount?: number;
}

/**
 * Skeleton de chargement pour CuratedPicks (Coups de Coeur)
 * Affiche un état de chargement structuré pendant le streaming SSR
 *
 * Reproduit exactement la structure de CuratedPicks pour éviter
 * les layout shifts lors du chargement (CLS optimization)
 *
 * @param productsCount - Nombre de produits dans la grille (par défaut: 4)
 */
export function CuratedPicksSkeleton({
	productsCount = 4,
}: CuratedPicksSkeletonProps = {}) {
	return (
		<section
			className={`relative overflow-hidden bg-muted/20 ${SECTION_SPACING.section}`}
			aria-label="Chargement des coups de coeur"
		>
			{/* Décorations subtiles */}
			<div
				className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"
				aria-hidden="true"
			/>
			<div
				className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none"
				aria-hidden="true"
			/>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="mb-8 text-center lg:mb-12">
					{/* Titre skeleton */}
					<div className="h-10 w-72 mx-auto bg-muted animate-pulse rounded" />
					{/* Sous-titre skeleton */}
					<div className="mt-4 h-7 w-full max-w-sm mx-auto bg-muted/50 animate-pulse rounded" />
					{/* Citation skeleton */}
					<div className="mt-3 h-8 w-64 mx-auto bg-muted/30 animate-pulse rounded" />
				</header>

				{/* Grid skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12">
					{Array.from({ length: productsCount }).map((_, i) => (
						<div key={i} className="relative">
							{/* Badge skeleton */}
							<div className="absolute -top-2 -right-2 z-10 w-8 h-6 bg-primary animate-pulse rounded-full" />
							<div className="bg-card rounded-lg border-2 border-transparent shadow-sm overflow-hidden">
								{/* Image skeleton */}
								<div className="aspect-4/5 bg-muted animate-pulse" />
								{/* Contenu */}
								<div className="p-4 space-y-2">
									<div className="h-6 bg-muted rounded animate-pulse" />
									<div className="h-5 w-20 bg-muted rounded animate-pulse" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* CTA skeleton */}
				<div className="text-center">
					<div className="h-12 w-56 mx-auto bg-muted animate-pulse rounded-md shadow-lg" />
				</div>
			</div>
		</section>
	);
}
