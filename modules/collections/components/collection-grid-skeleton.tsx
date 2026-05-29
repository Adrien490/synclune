import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function CollectionGridSkeleton() {
	return (
		<div className="space-y-8">
			{/* Grille des collections - structure alignée avec CollectionGrid */}
			<div className="xs:grid-cols-2 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="grid gap-4">
						{/* Image skeleton - aspect-square comme dans CollectionCard */}
						<Skeleton className="aspect-square w-full rounded-lg lg:rounded-xl" />

						{/* Contenu — centré comme CollectionCard */}
						<div className="flex flex-col items-center gap-2 px-4 pb-4">
							{/* Divider skeleton (h-0.5 w-16 mx-auto) */}
							<Skeleton className="mb-1 h-0.5 w-16" />

							{/* Title skeleton - 2 lines (line-clamp-2) */}
							<Skeleton className="h-6 w-3/4" />
							<Skeleton className="h-6 w-1/2" />

							{/* Price skeleton (from-price) */}
							<Skeleton className="h-4 w-24" />

							{/* Product count skeleton */}
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-end">
				<CursorPaginationSkeleton />
			</div>
		</div>
	);
}
