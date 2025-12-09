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
				<div key={i} className="flex gap-3 p-3 border rounded-lg">
					{/* Image placeholder */}
					<Skeleton className="w-20 h-20 rounded-md shrink-0" />

					{/* Content placeholder */}
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-3 w-1/4" />
					</div>

					{/* Price placeholder */}
					<div className="flex flex-col items-end gap-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-8 w-20" />
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
