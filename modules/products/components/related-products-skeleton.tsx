/**
 * Skeleton de chargement pour le composant RelatedProducts
 *
 * ⚠️ IMPORTANT : Ce skeleton DOIT correspondre EXACTEMENT à la structure
 * du composant RelatedProducts pour éviter le Cumulative Layout Shift (CLS).
 *
 * Structure à respecter :
 * - Container : <aside className="space-y-6">
 * - En-tête : <div className="space-y-2"> avec h2
 * - Carousel : flex horizontal avec basis-[clamp(...)]
 * - Cards : ProductCard structure
 * - CTA : <div className="flex justify-center pt-4">
 */
export function RelatedProductsSkeleton({ limit = 8 }: { limit?: number }) {
	return (
		<aside className="space-y-6" aria-label="Chargement des produits similaires">
			{/* En-tête de section - Correspond exactement à RelatedProducts */}
			<div className="space-y-2">
				{/* h2 avec text-2xl font-semibold tracking-tight */}
				<div className="bg-muted h-8 w-64 animate-pulse rounded" />
			</div>

			{/* Carousel skeleton - Correspond à la structure du carousel */}
			<div className="w-full overflow-hidden">
				<div className="-ml-4 flex py-4 sm:-ml-6">
					{[...Array(limit)].map((_, index) => (
						<div
							key={index}
							className="flex-shrink-0 basis-[clamp(200px,72vw,280px)] pl-4 sm:pl-6 md:basis-1/3 lg:basis-1/4"
						>
							<ProductCardSkeleton />
						</div>
					))}
				</div>

				{/* Dots skeleton - Mobile uniquement */}
				<div className="mt-4 flex justify-center gap-2 md:hidden">
					{[...Array(Math.min(5, limit))].map((_, i) => (
						<div key={i} className="bg-muted h-2 w-2 animate-pulse rounded-full" />
					))}
				</div>
			</div>

			{/* CTA - Correspond exactement à RelatedProducts */}
			<div className="flex justify-center pt-4">
				<div className="bg-muted h-5 w-64 animate-pulse rounded" />
			</div>
		</aside>
	);
}

/**
 * Skeleton d'une ProductCard
 *
 * Structure exacte de ProductCard:
 * - article avec rounded-lg, shadow-sm, bg-card, gap-4
 * - Image : aspect-square sm:aspect-4/5, rounded-lg
 * - Contenu : flex flex-col gap-2.5 sm:gap-3, px-3 pb-3 sm:px-4 sm:pb-4
 *   - Titre : text-base sm:text-lg
 *   - Prix : ProductPrice
 *
 * ⚠️ IMPORTANT : Les dimensions DOIVENT correspondre exactement à ProductCard
 * pour éviter le Cumulative Layout Shift (CLS).
 */
function ProductCardSkeleton() {
	return (
		<div className="product-card-skeleton bg-card grid gap-4 overflow-hidden rounded-lg shadow-sm">
			{/* Image - aspect-square sur mobile, aspect-4/5 sur desktop (comme ProductCard) */}
			<div className="bg-muted aspect-3/4 animate-pulse rounded-lg sm:aspect-4/5" />

			{/* Contenu - gap et padding identiques à ProductCard */}
			<div className="flex flex-col gap-2.5 px-3 pb-3 sm:gap-3 sm:px-4 sm:pb-4">
				{/* Titre - text-base sm:text-lg (hauteur correspondante) */}
				<div className="bg-muted h-5 w-full animate-pulse rounded sm:h-6" />

				{/* Prix - ProductPrice */}
				<div className="bg-muted h-5 w-20 animate-pulse rounded" />
			</div>
		</div>
	);
}
