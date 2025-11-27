/**
 * Skeleton de chargement pour le composant RelatedProducts
 *
 * ⚠️ IMPORTANT : Ce skeleton DOIT correspondre EXACTEMENT à la structure
 * du composant RelatedProducts pour éviter le Cumulative Layout Shift (CLS).
 *
 * Structure à respecter :
 * - Container : <aside className="space-y-6">
 * - En-tête : <div className="space-y-2"> avec h2 + p
 * - Grille : grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6
 * - Cards : ProductCard avec size="md" structure
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
				{/* h2 avec text-2xl font-semibold tracking-tight + flex items-center gap-2 */}
				<div className="h-8 w-64 bg-muted animate-pulse rounded" />

				{/* p avec text-sm leading-normal text-muted-foreground */}
				<div className="h-5 w-80 max-w-full bg-muted animate-pulse rounded" />
			</div>

			{/* Grille de produits - Correspond EXACTEMENT à la grille de RelatedProducts */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
				{[...Array(limit)].map((_, index) => (
					<ProductCardSkeleton key={index} />
				))}
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
