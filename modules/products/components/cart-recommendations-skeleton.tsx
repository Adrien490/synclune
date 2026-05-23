import { ProductCardSkeleton } from "@/modules/products/components/product-card-skeleton";
import { Separator } from "@/shared/components/ui/separator";

/**
 * Skeleton pour CartRecommendations
 */
export function CartRecommendationsSkeleton({ limit = 4 }: { limit?: number }) {
	return (
		<aside className="mt-8 lg:mt-12" aria-label="Chargement des recommandations">
			<Separator className="mb-8 lg:mb-12" />

			{/* En-tête */}
			<div className="mb-6 space-y-2">
				<div className="bg-muted h-8 w-48 rounded motion-safe:animate-pulse" />
				<div className="bg-muted h-5 w-72 max-w-full rounded motion-safe:animate-pulse" />
			</div>

			{/* Grille */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
				{Array.from({ length: limit }).map((_, index) => (
					<ProductCardSkeleton key={index} />
				))}
			</div>
		</aside>
	);
}
