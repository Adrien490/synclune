/**
 * Skeleton aligné sur la structure réelle de `ProductCard` (anti-CLS).
 *
 * SSOT consommé par les sections qui rendent une grille / un carousel de
 * ProductCard derrière un Suspense (CartRecommendations, RelatedProducts, …).
 *
 * Les dimensions reflètent celles de ProductCard (redesign Atelier 2026-08-03) :
 * - article : cadre polaroid `rounded-md border-2 p-2 pb-0 sm:p-2.5 sm:pb-0`
 * - media : `aspect-4/5 rounded-sm` (ratio unifié tous viewports)
 * - légende : `flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4`
 *   → eyebrow (h-3) + titre (`text-base sm:text-lg` → h-5 sm:h-6) + prix (~h-5)
 */
export function ProductCardSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="product-card-skeleton bg-card grid rounded-md border-2 border-transparent p-2 pb-0 shadow-sm sm:p-2.5 sm:pb-0"
		>
			<div className="bg-muted aspect-4/5 rounded-sm motion-safe:animate-pulse" />

			<div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				<div className="bg-muted h-3 w-24 rounded motion-safe:animate-pulse" />
				<div className="bg-muted h-5 w-full rounded motion-safe:animate-pulse sm:h-6" />
				<div className="bg-muted h-5 w-20 rounded motion-safe:animate-pulse" />
			</div>
		</div>
	);
}
