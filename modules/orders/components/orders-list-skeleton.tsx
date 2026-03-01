import { Skeleton } from "@/shared/components/ui/skeleton";

export function OrdersListSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, index) => (
				<div
					key={index}
					className="bg-card-soft border-border-soft rounded-lg border p-6 shadow-sm"
				>
					{/* Header skeleton */}
					<div className="border-border-soft mb-4 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<Skeleton className="h-12 w-12 rounded-lg" />
							<div className="space-y-2">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-4 w-32" />
							</div>
						</div>
						<Skeleton className="h-6 w-24 self-start sm:self-auto" />
					</div>

					{/* Details skeleton */}
					<div className="mb-6 grid grid-cols-2 gap-4">
						<div>
							<Skeleton className="mb-2 h-4 w-16" />
							<Skeleton className="h-5 w-24" />
						</div>
						<div>
							<Skeleton className="mb-2 h-4 w-16" />
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
