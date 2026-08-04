import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function CollectionGridSkeleton() {
	return (
		<div className="space-y-8">
			{/* Grille des collections - structure alignée avec CollectionGrid */}
			<div className="xs:grid-cols-2 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
				{Array.from({ length: 8 }).map((_, i) => (
					/* Cadre planche-contact — miroir de CollectionCard (redesign 2026-08-03) :
					   `rounded-md border-2 p-2 pb-0 sm:p-2.5 sm:pb-0`, tirage `rounded-sm`,
					   légende `gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4`
					   (eyebrow h-3 → titre `text-base sm:text-lg` → description → prix) */
					<div
						key={i}
						className="bg-card rounded-md border-2 border-transparent p-2 pb-0 shadow-sm sm:p-2.5 sm:pb-0"
					>
						<Skeleton className="aspect-square w-full rounded-sm" />

						<div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
							{/* Eyebrow « Collection · N créations » */}
							<Skeleton className="h-3 w-28" />

							{/* Title (line-clamp-2, une ligne dans le cas nominal) */}
							<Skeleton className="h-5 w-3/4 sm:h-6" />

							{/* Description */}
							<Skeleton className="h-4 w-full" />

							{/* Price skeleton (from-price) */}
							<Skeleton className="h-4 w-24" />
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
