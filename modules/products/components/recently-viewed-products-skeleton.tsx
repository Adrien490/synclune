import { ProductCardSkeleton } from "./product-card-skeleton";

/**
 * Skeleton de chargement pour le composant RecentlyViewedProducts
 *
 * Structure a respecter :
 * - Container : <aside className="space-y-6">
 * - En-tete : <div className="space-y-2"> avec h2
 * - Grille : grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6
 * - Cards : SSOT `ProductCardSkeleton` (parité anti-CLS structurelle avec
 *   ProductCard — l'ancienne copie locale avait dérivé du redesign Atelier)
 */
export function RecentlyViewedProductsSkeleton({ limit = 4 }: { limit?: number }) {
	return (
		<aside className="space-y-6" aria-label="Chargement des produits recemment vus">
			{/* En-tete de section */}
			<div className="space-y-2">
				<div className="bg-muted h-8 w-48 rounded motion-safe:animate-pulse" />
			</div>

			{/* Grille de produits */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
				{Array.from({ length: limit }).map((_, index) => (
					<ProductCardSkeleton key={index} />
				))}
			</div>
		</aside>
	);
}
