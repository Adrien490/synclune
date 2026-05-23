/**
 * Skeleton aligné sur la structure réelle de `ProductCard` (anti-CLS).
 *
 * SSOT consommé par les sections qui rendent une grille / un carousel de
 * ProductCard derrière un Suspense (CartRecommendations, RelatedProducts, …).
 *
 * Les dimensions reflètent celles de ProductCard :
 * - article : `grid gap-4 rounded-lg sm:rounded-xl` + border 2px transparent
 *   (mêmes 4px d'épaisseur que la card hover : border-primary/40)
 * - media : `aspect-3/4 sm:aspect-4/5`
 * - content : `flex flex-col gap-3 px-3 pt-1 pb-4 sm:gap-3.5 sm:px-4 sm:pb-5 lg:px-5 lg:pb-6`
 * - title : `text-base sm:text-lg` → h-5 sm:h-6
 * - price : ~h-5
 */
export function ProductCardSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="product-card-skeleton bg-card grid gap-4 overflow-hidden rounded-lg border-2 border-transparent shadow-sm sm:rounded-xl"
		>
			<div className="bg-muted aspect-3/4 rounded-lg motion-safe:animate-pulse sm:aspect-4/5 sm:rounded-xl" />

			<div className="flex flex-col gap-3 px-3 pt-1 pb-4 sm:gap-3.5 sm:px-4 sm:pb-5 lg:px-5 lg:pb-6">
				<div className="bg-muted h-5 w-full rounded motion-safe:animate-pulse sm:h-6" />
				<div className="bg-muted h-5 w-20 rounded motion-safe:animate-pulse" />
			</div>
		</div>
	);
}
