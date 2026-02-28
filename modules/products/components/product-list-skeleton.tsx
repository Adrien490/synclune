import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

export function ProductListSkeleton() {
	return (
		<div className="space-y-6">
			{/* Compteur de resultats */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-24 rounded" />
			</div>

			{/* Grille des produits */}
			<div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 2xl:grid-cols-5">
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={i}
						className="product-item"
						style={{
							// Staggered animation delay for wave effect
							animationDelay: `${i * 100}ms`,
						}}
					>
						<article
							className={cn(
								"product-card relative grid gap-4 overflow-hidden rounded-lg",
								"bg-card border-2 border-transparent shadow-sm",
								// Staggered entrance animation
								"motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4",
								"motion-safe:duration-300",
							)}
							style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
						>
							{/* Image avec aspect-4/5 ratio */}
							<div className="product-card-media bg-muted relative aspect-3/4 overflow-hidden rounded-lg sm:aspect-4/5">
								<Skeleton className="absolute inset-0 rounded-lg" />
							</div>

							{/* Contenu — padding matches product-card.tsx (no padding-top) */}
							<div className="relative flex flex-col gap-2.5 px-3 pb-3 sm:gap-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
								{/* Titre - line-clamp-1 sm:line-clamp-2 */}
								<Skeleton className="h-5 w-4/5 rounded sm:h-6" />

								{/* Color swatches placeholder */}
								<div className="flex gap-1.5">
									<Skeleton className="size-4 rounded-full sm:size-5" />
									<Skeleton className="size-4 rounded-full sm:size-5" />
									<Skeleton className="size-4 rounded-full sm:size-5" />
								</div>

								{/* Prix */}
								<Skeleton className="h-6 w-1/3 rounded" />

								{/* Bouton mobile */}
								<Skeleton className="h-10 w-full rounded-md sm:hidden" />
							</div>
						</article>
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="mt-8 flex justify-end lg:mt-12">
				<CursorPaginationSkeleton />
			</div>
		</div>
	);
}
