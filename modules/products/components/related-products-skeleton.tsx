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
		<aside
			className="space-y-6"
			aria-label="Chargement des produits similaires"
		>
			{/* En-tête de section - Correspond exactement à RelatedProducts */}
			<div className="space-y-2">
				{/* h2 avec text-2xl font-semibold tracking-tight */}
				<div className="h-8 w-64 bg-muted animate-pulse rounded" />
			</div>

			{/* Carousel skeleton - Correspond à la structure du carousel */}
			<div className="w-full overflow-hidden">
				<div className="-ml-4 sm:-ml-6 flex py-4">
					{[...Array(limit)].map((_, index) => (
						<div
							key={index}
							className="pl-4 sm:pl-6 flex-shrink-0 basis-[clamp(200px,72vw,280px)] md:basis-1/3 lg:basis-1/4"
						>
							<ProductCardSkeleton />
						</div>
					))}
				</div>

				{/* Dots skeleton - Mobile uniquement */}
				<div className="md:hidden flex justify-center gap-2 mt-4">
					{[...Array(Math.min(5, limit))].map((_, i) => (
						<div
							key={i}
							className="h-2 w-2 rounded-full bg-muted animate-pulse"
						/>
					))}
				</div>
			</div>

			{/* CTA - Correspond exactement à RelatedProducts */}
			<div className="flex justify-center pt-4">
				<div className="h-5 w-64 bg-muted animate-pulse rounded" />
			</div>
		</aside>
	);
}

/**
 * Skeleton d'une ProductCard avec size="md"
 *
 * Structure exacte de ProductCard (full-bleed):
 * - article avec rounded-lg, shadow-sm, bg-white (SANS p-4)
 * - Image : aspect-[4/5], full-bleed avec rounded-t-lg
 * - Contenu : flex flex-col gap-2 p-4
 *   - Titre : line-clamp-2, text-lg (2 lignes)
 *   - Prix : text-sm (1 ligne)
 *
 * Note : showDescription={false} donc pas de description
 */
function ProductCardSkeleton() {
	return (
		<div className="product-card-skeleton bg-white rounded-lg shadow-sm overflow-hidden">
			{/* Image - aspect-[4/5] full-bleed avec rounded-t-lg */}
			<div className="aspect-[4/5] bg-muted animate-pulse" />

			{/* Contenu - p-4 flex flex-col gap-2 comme ProductCard */}
			<div className="flex flex-col gap-2 p-4">
				{/* Titre - line-clamp-2 text-lg (2 lignes de h-6 = h-12 total) */}
				<div className="space-y-2">
					<div className="h-6 bg-muted animate-pulse rounded" />
					<div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
				</div>

				{/* Prix - ProductPriceCompact avec size="sm" → text-sm → h-5 */}
				<div className="h-5 w-20 bg-muted animate-pulse rounded" />
			</div>
		</div>
	);
}
