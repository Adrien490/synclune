import {
	Skeleton,
	SkeletonGroup,
	SkeletonText,
} from "@/shared/components/ui/skeleton"

import { SKELETON_ROWS } from "./constants"

/**
 * Skeleton for quick search results matching the SearchResultItem layout.
 */
export function SearchResultsSkeleton() {
	return (
		<SkeletonGroup label="Chargement des resultats..." className="space-y-2 px-4">
			{Array.from({ length: SKELETON_ROWS }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 py-2">
					<Skeleton shape="rounded" className="size-12 shrink-0" />
					<div className="flex-1 min-w-0">
						<SkeletonText lines={2} />
					</div>
				</div>
			))}
		</SkeletonGroup>
	)
}
