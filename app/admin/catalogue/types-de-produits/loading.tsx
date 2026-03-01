import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for product types management page
 */
export default function ProductTypesLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des types de produits">
			<span className="sr-only">Chargement des types de produits...</span>

			{/* Page Header */}
			<div className="mb-8 flex items-center justify-between">
				<div className="space-y-3">
					<Skeleton className="from-primary/20 to-primary/10 h-10 w-56 bg-linear-to-r" />
					<Skeleton className="bg-muted/30 h-6 w-96" />
				</div>
				<Skeleton className="bg-primary/30 h-10 w-48 rounded-md shadow-md" />
			</div>

			<div className="space-y-6">
				{/* Toolbar */}
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
					<Skeleton className="bg-muted/40 h-10 flex-1 rounded-md sm:max-w-md" />
					<Skeleton className="bg-muted/40 h-10 w-full rounded-md sm:w-48" />
				</div>

				{/* Data Table */}
				<div className="border-primary/15 from-primary/3 overflow-hidden rounded-lg border-2 bg-linear-to-br to-transparent">
					{/* Table Header */}
					<div className="border-primary/10 from-primary/5 border-b-2 bg-linear-to-r to-transparent p-4">
						<div className="grid grid-cols-12 items-center gap-4">
							<Skeleton className="bg-muted/40 h-5 w-5" />
							<Skeleton className="bg-muted/50 col-span-2 h-5 w-12" />
							<Skeleton className="bg-muted/50 col-span-3 h-5 w-24" />
							<Skeleton className="bg-muted/40 col-span-3 h-5 w-32" />
							<Skeleton className="bg-muted/40 col-span-2 h-5 w-20" />
							<Skeleton className="bg-muted/40 h-5 w-8" />
						</div>
					</div>

					{/* Table Rows */}
					{Array.from({ length: 12 }).map((_, i) => (
						<div
							key={i}
							className="border-border hover:bg-primary/5 border-b p-4 transition-colors last:border-0"
						>
							<div className="grid grid-cols-12 items-center gap-4">
								<Skeleton className="bg-muted/30 h-5 w-5" />
								<Skeleton className="bg-muted/40 col-span-2 h-10 w-10 rounded-full" />
								<div className="col-span-3 space-y-2">
									<Skeleton className="bg-muted/50 h-4 w-full" />
									<Skeleton className="bg-muted/30 h-3 w-24" />
								</div>
								<Skeleton className="bg-muted/40 col-span-3 h-4 w-full" />
								<Skeleton className="bg-muted/40 col-span-2 h-4 w-12" />
								<Skeleton className="bg-muted/30 h-8 w-8 rounded" />
							</div>
						</div>
					))}
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
