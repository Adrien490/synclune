/**
 * Skeleton pour CartRecommendations
 */
export function CartRecommendationsSkeleton({ limit = 4 }: { limit?: number }) {
	return (
		<aside className="mt-8 lg:mt-12" aria-label="Chargement des recommandations">
			<div className="h-px bg-border mb-8 lg:mb-12" />

			{/* En-tête */}
			<div className="space-y-2 mb-6">
				<div className="h-7 w-48 bg-muted animate-pulse rounded" />
				<div className="h-5 w-72 max-w-full bg-muted animate-pulse rounded" />
			</div>

			{/* Grille */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
				{[...Array(limit)].map((_, index) => (
					<div key={index} className="bg-card rounded-lg shadow-sm overflow-hidden">
						<div className="aspect-[4/5] bg-muted animate-pulse" />
						<div className="p-3 space-y-2">
							<div className="h-5 bg-muted animate-pulse rounded" />
							<div className="h-4 w-16 bg-muted animate-pulse rounded" />
						</div>
					</div>
				))}
			</div>
		</aside>
	);
}
