import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function WishlistGridSkeleton() {
	return (
		<div className="space-y-8">
			{/* Grille des produits favoris */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="wishlist-item">
						<article className="relative overflow-hidden bg-card rounded-lg p-4 border-2 border-transparent shadow-sm">
							{/* Image avec aspect-[4/5] ratio */}
							<div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted">
								<Skeleton className="absolute inset-0" />
							</div>

							{/* Contenu */}
							<div className="flex flex-col gap-2 relative mt-4">
								{/* Titre - 2 lignes (line-clamp-2) */}
								<div className="space-y-2">
									<Skeleton className="h-5 w-full" />
									<Skeleton className="h-5 w-3/4" />
								</div>

								{/* Prix */}
								<Skeleton className="h-6 w-1/3" />
							</div>
						</article>
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-end mt-12">
				<CursorPaginationSkeleton />
			</div>
		</div>
	);
}
