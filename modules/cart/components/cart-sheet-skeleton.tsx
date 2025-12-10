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
					className="grid grid-cols-[5rem_1fr] sm:grid-cols-[6rem_1fr_auto] gap-3 p-3 border rounded-lg"
				>
					{/* Image placeholder - row-span-2 sur mobile */}
					<Skeleton className="size-20 sm:size-24 row-span-2 sm:row-span-1 rounded-md" />

					{/* Content placeholder */}
					<div className="flex-1 min-w-0 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
						<Skeleton className="h-4 w-1/3" />
					</div>

					{/* Actions placeholder - pleine largeur sur mobile */}
					<div className="col-span-2 sm:col-span-1 flex items-center justify-between gap-2 sm:flex-col sm:items-end">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-11 sm:h-9 w-28" />
						<Skeleton className="h-4 w-14" />
					</div>
				</div>
			))}

			{/* Summary placeholder */}
			<div className="mt-6 pt-4 border-t space-y-3">
				<div className="flex justify-between">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-16" />
				</div>
				<div className="flex justify-between pt-2">
					<Skeleton className="h-6 w-12" />
					<Skeleton className="h-6 w-20" />
				</div>
			</div>
		</div>
	);
}
