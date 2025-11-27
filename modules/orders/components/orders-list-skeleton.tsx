import { Skeleton } from "@/shared/components/ui/skeleton";

export function OrdersListSkeleton() {
	return (
		<div className="space-y-4">
			{[...Array(3)].map((_, index) => (
				<div
					key={index}
					className="bg-card-soft border border-border-soft rounded-lg p-6 shadow-sm"
				>
					{/* Header skeleton */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-border-soft">
						<div className="flex items-center gap-3">
							<Skeleton className="w-12 h-12 rounded-lg" />
							<div className="space-y-2">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-4 w-32" />
							</div>
						</div>
						<Skeleton className="h-6 w-24 self-start sm:self-auto" />
					</div>

					{/* Details skeleton */}
					<div className="grid grid-cols-2 gap-4 mb-6">
						<div>
							<Skeleton className="h-4 w-16 mb-2" />
							<Skeleton className="h-5 w-24" />
						</div>
						<div>
							<Skeleton className="h-4 w-16 mb-2" />
							<Skeleton className="h-5 w-20" />
						</div>
					</div>

					{/* Actions skeleton */}
					<Skeleton className="h-10 w-full sm:w-40" />
				</div>
			))}
		</div>
	);
}
