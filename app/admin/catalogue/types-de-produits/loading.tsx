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
					<Skeleton className="h-10 w-56 bg-linear-to-r from-primary/20 to-primary/10" />
					<Skeleton className="h-6 w-96 bg-muted/30" />
				</div>
				<Skeleton className="h-10 w-48 bg-primary/30 rounded-md shadow-md" />
			</div>

			<div className="space-y-6">
				{/* Toolbar */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
					<Skeleton className="h-10 flex-1 sm:max-w-md bg-muted/40 rounded-md" />
					<Skeleton className="h-10 w-full sm:w-48 bg-muted/40 rounded-md" />
				</div>

				{/* Data Table */}
				<div className="rounded-lg border-2 border-primary/15 bg-linear-to-br from-primary/3 to-transparent overflow-hidden">
					{/* Table Header */}
					<div className="border-b-2 border-primary/10 p-4 bg-linear-to-r from-primary/5 to-transparent">
						<div className="grid grid-cols-12 gap-4 items-center">
							<Skeleton className="h-5 w-5 bg-muted/40" />
							<Skeleton className="h-5 w-12 col-span-2 bg-muted/50" />
							<Skeleton className="h-5 w-24 col-span-3 bg-muted/50" />
							<Skeleton className="h-5 w-32 col-span-3 bg-muted/40" />
							<Skeleton className="h-5 w-20 col-span-2 bg-muted/40" />
							<Skeleton className="h-5 w-8 bg-muted/40" />
						</div>
					</div>

					{/* Table Rows */}
					{Array.from({ length: 12 }).map((_, i) => (
						<div key={i} className="border-b border-border last:border-0 p-4 hover:bg-primary/5 transition-colors">
							<div className="grid grid-cols-12 gap-4 items-center">
								<Skeleton className="h-5 w-5 bg-muted/30" />
								<Skeleton className="h-10 w-10 col-span-2 rounded-full bg-muted/40" />
								<div className="col-span-3 space-y-2">
									<Skeleton className="h-4 w-full bg-muted/50" />
									<Skeleton className="h-3 w-24 bg-muted/30" />
								</div>
								<Skeleton className="h-4 w-full col-span-3 bg-muted/40" />
								<Skeleton className="h-4 w-12 col-span-2 bg-muted/40" />
								<Skeleton className="h-8 w-8 rounded bg-muted/30" />
							</div>
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
