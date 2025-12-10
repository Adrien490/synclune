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
					<Skeleton className="h-10 w-48 bg-linear-to-r from-primary/20 to-primary/10" />
					<Skeleton className="h-6 w-96 bg-muted/30" />
				</div>
				<Skeleton className="h-10 w-40 bg-primary/30 rounded-md shadow-md" />
			</div>

			<div className="space-y-6">
				{/* Toolbar */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
					<Skeleton className="h-10 flex-1 sm:max-w-md bg-muted/40 rounded-md" />
					<Skeleton className="h-10 w-full sm:w-48 bg-muted/40 rounded-md" />
				</div>

				{/* Materials Table */}
				<div className="rounded-lg border bg-card">
					<div className="p-6">
						{/* Table header skeleton */}
						<div className="flex items-center gap-4 mb-4 pb-4 border-b">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-48 hidden md:block" />
							<Skeleton className="h-4 w-16 hidden sm:block" />
							<Skeleton className="h-4 w-16 hidden sm:block" />
							<Skeleton className="h-4 w-8 ml-auto" />
						</div>

						{/* Table rows skeleton */}
						{Array.from({ length: 10 }).map((_, i) => (
							<div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
								<Skeleton className="h-4 w-4" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-48 hidden md:block" />
								<Skeleton className="h-5 w-12 hidden sm:block" />
								<Skeleton className="h-4 w-8 hidden sm:block" />
								<Skeleton className="h-8 w-8 ml-auto" />
							</div>
						))}
					</div>
				</div>

				{/* Pagination */}
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-40 bg-muted/30" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-10 w-10 bg-muted/40 rounded-md" />
						<Skeleton className="h-10 w-32 bg-muted/40 rounded-md" />
						<Skeleton className="h-10 w-10 bg-muted/40 rounded-md" />
					</div>
				</div>
			</div>
		</div>
	);
}
