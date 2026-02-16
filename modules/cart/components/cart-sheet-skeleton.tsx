"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le cart sheet
 * Affiche 3 items placeholder pendant le fetch initial
 */
export function CartSheetSkeleton() {
	return (
		<div className="flex-1 px-6 py-4 space-y-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className="grid grid-cols-[5rem_1fr] sm:grid-cols-[6rem_1fr] gap-3 p-3 border rounded-lg"
				>
					{/* Image placeholder - row-span-2 matching actual layout */}
					<Skeleton className="size-20 sm:size-24 row-span-2 rounded-md" />

					{/* Content placeholder */}
					<div className="min-w-0 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
						<Skeleton className="h-4 w-1/3" />
					</div>

					{/* Actions placeholder - same row as image row 2 */}
					<div className="flex items-center justify-between gap-2">
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-4 w-14" />
					</div>
				</div>
			))}
		</div>
	);
}
