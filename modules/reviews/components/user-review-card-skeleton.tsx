import { Skeleton } from "@/shared/components/ui/skeleton"

export function UserReviewCardSkeleton() {
	return (
		<div>
			<div className="flex flex-col sm:flex-row">
				{/* Image */}
				<Skeleton className="w-full sm:w-32 aspect-[3/2] sm:aspect-auto sm:h-auto shrink-0" />

				{/* Content */}
				<div className="flex-1 p-4 space-y-3">
					{/* Header: title + badge */}
					<div className="flex items-start justify-between gap-2">
						<div className="space-y-1.5 flex-1 min-w-0">
							<Skeleton className="h-5 w-40 bg-muted/50" />
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-20 bg-muted/40" />
								<Skeleton className="h-3 w-24 bg-muted/30" />
							</div>
						</div>
						<Skeleton className="h-5 w-16 rounded-full bg-muted/40" />
					</div>

					{/* Review title */}
					<Skeleton className="h-4 w-48 bg-muted/40" />

					{/* Review content */}
					<div className="space-y-1.5">
						<Skeleton className="h-3.5 w-full bg-muted/30" />
						<Skeleton className="h-3.5 w-4/5 bg-muted/30" />
					</div>

					{/* Actions */}
					<div className="flex gap-2 pt-2">
						<Skeleton className="h-9 w-24 bg-muted/40" />
						<Skeleton className="h-9 w-24 bg-muted/40" />
					</div>
				</div>
			</div>
		</div>
	)
}
