import { ProductCardSkeleton } from "@/modules/products/components/product-card-skeleton";

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
 * - Cards : ProductCard structure (via ProductCardSkeleton partagé)
 * - CTA : <div className="flex justify-center pt-4">
 */
export function RelatedProductsSkeleton({ limit = 8 }: { limit?: number }) {
	return (
		<aside className="space-y-6" aria-label="Chargement des produits similaires">
			{/* En-tête de section - Correspond exactement à RelatedProducts */}
			<div className="space-y-2">
				{/* h2 avec text-2xl font-semibold tracking-tight */}
				<div className="bg-muted h-8 w-64 rounded motion-safe:animate-pulse" />
			</div>

			{/* Carousel skeleton - Correspond à la structure du carousel */}
			<div className="w-full overflow-hidden">
				<div className="-ml-4 flex py-4 sm:-ml-6">
					{Array.from({ length: limit }).map((_, index) => (
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
					{Array.from({ length: Math.min(5, limit) }).map((_, i) => (
						<div key={i} className="bg-muted size-2 rounded-full motion-safe:animate-pulse" />
					))}
				</div>
			</div>

			{/* CTA - Correspond exactement à RelatedProducts */}
			<div className="flex justify-center pt-4">
				<div className="bg-muted h-5 w-64 rounded motion-safe:animate-pulse" />
			</div>
		</aside>
	);
}
