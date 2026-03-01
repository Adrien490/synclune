/**
 * Skeleton pour CartRecommendations
 */
export function CartRecommendationsSkeleton({ limit = 4 }: { limit?: number }) {
	return (
		<aside className="mt-8 lg:mt-12" aria-label="Chargement des recommandations">
			<div className="bg-border mb-8 h-px lg:mb-12" />

			{/* En-tête */}
			<div className="mb-6 space-y-2">
				<div className="bg-muted h-7 w-48 rounded motion-safe:animate-pulse" />
				<div className="bg-muted h-5 w-72 max-w-full rounded motion-safe:animate-pulse" />
			</div>

			{/* Grille */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
				{Array.from({ length: limit }).map((_, index) => (
					<div key={index} className="bg-card overflow-hidden rounded-lg shadow-sm">
						<div className="bg-muted aspect-3/4 motion-safe:animate-pulse sm:aspect-4/5" />
						<div className="space-y-2 p-3">
							<div className="bg-muted h-5 rounded motion-safe:animate-pulse" />
							<div className="bg-muted h-4 w-16 rounded motion-safe:animate-pulse" />
						</div>
					</div>
				))}
			</div>
		</aside>
	);
}
