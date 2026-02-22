import { Skeleton } from "@/shared/components/ui/skeleton"

export function ReviewableProductCardSkeleton() {
	return (
		<div className="overflow-hidden rounded-lg border border-border/60">
			<div className="flex flex-col sm:flex-row">
				{/* Image */}
				<Skeleton className="w-full sm:w-32 aspect-[3/2] sm:aspect-auto sm:h-auto shrink-0" />

				{/* Content */}
				<div className="flex-1 p-4 space-y-3">
					<div>
						<Skeleton className="h-5 w-36 bg-muted/50" />
						<Skeleton className="h-3 w-28 bg-muted/30 mt-1.5" />
					</div>
					<Skeleton className="h-9 w-32 bg-muted/40" />
				</div>
			</div>
		</div>
	)
}
