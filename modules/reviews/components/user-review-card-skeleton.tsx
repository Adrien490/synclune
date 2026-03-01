import { Skeleton } from "@/shared/components/ui/skeleton";

export function UserReviewCardSkeleton() {
	return (
		<div>
			<div className="flex flex-col sm:flex-row">
				{/* Image */}
				<Skeleton className="aspect-[3/2] w-full shrink-0 sm:aspect-auto sm:h-auto sm:w-32" />

				{/* Content */}
				<div className="flex-1 space-y-3 p-4">
					{/* Header: title + badge */}
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1 space-y-1.5">
							<Skeleton className="bg-muted/50 h-5 w-40" />
							<div className="flex items-center gap-2">
								<Skeleton className="bg-muted/40 h-4 w-20" />
								<Skeleton className="bg-muted/30 h-3 w-24" />
							</div>
						</div>
						<Skeleton className="bg-muted/40 h-5 w-16 rounded-full" />
					</div>

					{/* Review title */}
					<Skeleton className="bg-muted/40 h-4 w-48" />

					{/* Review content */}
					<div className="space-y-1.5">
						<Skeleton className="bg-muted/30 h-3.5 w-full" />
						<Skeleton className="bg-muted/30 h-3.5 w-4/5" />
					</div>

					{/* Actions */}
					<div className="flex gap-2 pt-2">
						<Skeleton className="bg-muted/40 h-9 w-24" />
						<Skeleton className="bg-muted/40 h-9 w-24" />
					</div>
				</div>
			</div>
		</div>
	);
}
