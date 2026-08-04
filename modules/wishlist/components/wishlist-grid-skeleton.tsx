import { ProductCardSkeleton } from "@/modules/products/components/product-card-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function WishlistGridSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header placeholder (count) */}
			<Skeleton className="h-5 w-20 rounded" />

			{/* Grille — aligné sur wishlist-list-content.tsx ; cartes = SSOT
			 * ProductCardSkeleton (parité anti-CLS structurelle avec ProductCard).
			 * Pas de pagination : /favoris n'en a plus. */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={i}
						className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
						style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
					>
						<ProductCardSkeleton />
					</div>
				))}
			</div>
		</div>
	);
}
