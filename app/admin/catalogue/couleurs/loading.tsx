import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for colors management page
 */
export default function ColorsManagementLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des couleurs">
			<span className="sr-only">Chargement des couleurs...</span>

			{/* Page Header */}
			<div className="mb-8 flex items-center justify-between">
				<div className="space-y-3">
					<Skeleton className="h-10 w-48 bg-gradient-to-r from-primary/20 to-primary/10" />
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

				{/* Colors Grid */}
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{Array.from({ length: 24 }).map((_, i) => (
						<div key={i} className="relative overflow-hidden rounded-lg border-2 border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3 hover:shadow-lg transition-all duration-300">
							{/* Particule décorative */}
							<div className="absolute top-1 right-1 w-1 h-1 bg-secondary rounded-full opacity-40" aria-hidden="true" />
							<div className="flex items-start justify-between">
								<Skeleton className="h-16 w-16 rounded-lg bg-primary/20 border border-primary/30" />
								<Skeleton className="h-8 w-8 rounded bg-muted/30" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-full bg-primary/20" />
								<Skeleton className="h-3 w-20 bg-muted/30" />
							</div>
							<Skeleton className="h-3 w-16 bg-muted/30" />
						</div>
					))}
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
