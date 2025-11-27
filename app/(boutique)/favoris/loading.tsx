import { Skeleton } from "@/shared/components/ui/skeleton";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";

/**
 * Loading state for Favoris page
 * Reproduit la structure : ParticleSystem + PageHeader + WishlistGrid
 */
export default function FavorisLoading() {
	return (
		<div className="min-h-screen relative">
			{/* Les animations ParticleSystem et GlitterSparkles ne sont pas dans le loading
			    car elles sont purement décoratives et n'affectent pas le layout */}

			{/* PageHeader skeleton */}
			<div className="relative bg-background border-b border-border">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8 sm:py-10 lg:py-12">
					{/* Breadcrumbs skeleton */}
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="h-4 w-16 bg-muted/40" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="h-4 w-24 bg-muted/40" />
					</div>

					{/* Title skeleton */}
					<Skeleton className="h-10 w-48 bg-muted/50 mb-4" />
				</div>
			</div>

			{/* Content skeleton */}
			<div className="bg-background py-8 relative z-10">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
					<WishlistGridSkeleton />
				</div>
			</div>
		</div>
	);
}
