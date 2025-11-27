import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function CollectionGridSkeleton() {
	return (
		<div className="space-y-8">
			{/* Grille des collections */}
			<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="grid gap-4">
						{/* Image skeleton - aspect-square comme dans CollectionCard */}
						<Skeleton className="aspect-square w-full rounded-lg lg:rounded-xl" />

						{/* Contenu */}
						<div className="space-y-2">
							{/* Title skeleton - 2 lines (line-clamp-2) */}
							<div className="space-y-2">
								<Skeleton className="h-6 w-full" />
								<Skeleton className="h-6 w-3/4" />
							</div>

							{/* Description skeleton - 3 lines (line-clamp-3) */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
							</div>
						</div>
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
