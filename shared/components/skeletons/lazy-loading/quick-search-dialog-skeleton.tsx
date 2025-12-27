"use client";

import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";

/**
 * Skeleton de chargement pour le Quick Search Dialog
 * Affiche un input et une liste de resultats placeholder
 */
export function QuickSearchDialogSkeleton() {
	return (
		<Dialog open>
			<DialogContent className="overflow-hidden p-0 sm:max-w-lg">
				<SkeletonGroup label="Chargement de la recherche rapide" className="flex flex-col">
					{/* Search input */}
					<div className="flex items-center border-b px-3">
						<Skeleton className="size-4 mr-2" />
						<Skeleton className="h-11 flex-1" />
					</div>

					{/* Results list */}
					<div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md">
								<Skeleton className="size-10 rounded-md" />
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
								<Skeleton className="h-4 w-12" />
							</div>
						))}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between border-t px-3 py-2">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-3 w-16" />
					</div>
				</SkeletonGroup>
			</DialogContent>
		</Dialog>
	);
}
