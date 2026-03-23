import { Skeleton } from "@/shared/components/ui/skeleton";

export function OrderDetailSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
			{/* Left column */}
			<div className="space-y-6 lg:col-span-2">
				{/* Order items skeleton */}
				<div className="space-y-4 rounded-lg border p-6">
					<Skeleton className="h-5 w-32" />
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex gap-4">
								<Skeleton className="size-16 shrink-0 rounded-md" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
								<Skeleton className="h-4 w-16" />
							</div>
						))}
					</div>
				</div>
				{/* Timeline skeleton */}
				<div className="space-y-4 rounded-lg border p-6">
					<Skeleton className="h-5 w-40" />
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="size-3 shrink-0 rounded-full" />
								<Skeleton className="h-3 w-48" />
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Right column */}
			<div className="space-y-6 lg:col-span-1">
				{/* Summary skeleton */}
				<div className="space-y-3 rounded-lg border p-6">
					<Skeleton className="h-5 w-28" />
					<div className="space-y-2">
						<div className="flex justify-between">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
						<div className="flex justify-between">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-3 w-16" />
						</div>
						<div className="flex justify-between border-t pt-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
						</div>
					</div>
				</div>
				{/* Address skeleton */}
				<div className="space-y-3 rounded-lg border p-6">
					<Skeleton className="h-5 w-36" />
					<div className="space-y-2">
						<Skeleton className="h-3 w-40" />
						<Skeleton className="h-3 w-48" />
						<Skeleton className="h-3 w-32" />
					</div>
				</div>
			</div>
		</div>
	);
}
