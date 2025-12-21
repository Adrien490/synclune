/**
 * Skeleton de chargement pour le composant RecentlyViewedProducts
 *
 * Structure a respecter :
 * - Container : <aside className="space-y-6">
 * - En-tete : <div className="space-y-2"> avec h2
 * - Grille : grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6
 * - Cards : ProductCard structure
 */
export function RecentlyViewedProductsSkeleton({
	limit = 4,
}: {
	limit?: number
}) {
	return (
		<aside
			className="space-y-6"
			aria-label="Chargement des produits recemment vus"
		>
			{/* En-tete de section */}
			<div className="space-y-2">
				<div className="h-8 w-48 bg-muted animate-pulse rounded" />
			</div>

			{/* Grille de produits */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
				{[...Array(limit)].map((_, index) => (
					<ProductCardSkeleton key={index} />
				))}
			</div>
		</aside>
	)
}

/**
 * Skeleton d'une ProductCard
 */
function ProductCardSkeleton() {
	return (
		<div className="product-card-skeleton bg-white rounded-lg shadow-sm overflow-hidden">
			{/* Image - aspect-[4/5] full-bleed avec rounded-t-lg */}
			<div className="aspect-[4/5] bg-muted animate-pulse" />

			{/* Contenu - p-4 flex flex-col gap-2 comme ProductCard */}
			<div className="flex flex-col gap-2 p-4">
				{/* Titre - line-clamp-2 text-lg (2 lignes) */}
				<div className="space-y-2">
					<div className="h-6 bg-muted animate-pulse rounded" />
					<div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
				</div>

				{/* Prix */}
				<div className="h-5 w-20 bg-muted animate-pulse rounded" />
			</div>
		</div>
	)
}
