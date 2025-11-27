import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function ProductListSkeleton() {
	return (
		<div className="space-y-8">
			{/* Grille des produits */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="product-item">
						<article className="product-card grid relative overflow-hidden bg-white rounded-lg shadow-sm">
							{/* Image avec aspect-[4/5] ratio */}
							<div className="product-card-media relative aspect-[4/5] overflow-hidden bg-muted">
								<Skeleton className="absolute inset-0 rounded-t-lg" />
							</div>

							{/* Contenu */}
							<div className="flex flex-col gap-2 relative p-4">
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
