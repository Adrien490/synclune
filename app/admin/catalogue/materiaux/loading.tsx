import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for materials management page
 */
export default function MaterialsManagementLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des matériaux">
			<span className="sr-only">Chargement des matériaux...</span>

			{/* Page Header */}
			<div className="mb-8 flex items-center justify-between">
				<div className="space-y-3">
					<Skeleton className="from-primary/20 to-primary/10 h-10 w-48 bg-linear-to-r" />
					<Skeleton className="bg-muted/30 h-6 w-96" />
				</div>
				<Skeleton className="bg-primary/30 h-10 w-40 rounded-md shadow-md" />
			</div>

			<div className="space-y-6">
				{/* Toolbar */}
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
					<Skeleton className="bg-muted/40 h-10 flex-1 rounded-md sm:max-w-md" />
					<Skeleton className="bg-muted/40 h-10 w-full rounded-md sm:w-48" />
				</div>

				{/* Materials Table */}
				<div className="bg-card rounded-lg border">
					<div className="p-6">
						{/* Table header skeleton */}
						<div className="mb-4 flex items-center gap-4 border-b pb-4">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="hidden h-4 w-48 md:block" />
							<Skeleton className="hidden h-4 w-16 sm:block" />
							<Skeleton className="hidden h-4 w-16 sm:block" />
							<Skeleton className="ml-auto h-4 w-8" />
						</div>

						{/* Table rows skeleton */}
						{Array.from({ length: 10 }).map((_, i) => (
							<div key={i} className="flex items-center gap-4 border-b py-4 last:border-0">
								<Skeleton className="h-4 w-4" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="hidden h-4 w-48 md:block" />
								<Skeleton className="hidden h-5 w-12 sm:block" />
								<Skeleton className="hidden h-4 w-8 sm:block" />
								<Skeleton className="ml-auto h-8 w-8" />
							</div>
						))}
					</div>
				</div>

				{/* Pagination */}
				<div className="flex items-center justify-between">
					<Skeleton className="bg-muted/30 h-5 w-40" />
					<div className="flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-10 w-10 rounded-md" />
						<Skeleton className="bg-muted/40 h-10 w-32 rounded-md" />
						<Skeleton className="bg-muted/40 h-10 w-10 rounded-md" />
					</div>
				</div>
			</div>
		</div>
	);
}
