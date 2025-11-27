import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for dashboard catalog overview page
 */
export default function CatalogLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du catalogue">
			<span className="sr-only">Chargement du catalogue...</span>

			{/* Page Header */}
			<div className="mb-8 space-y-3">
				<Skeleton className="h-12 w-64 bg-gradient-to-r from-primary/20 to-primary/10" />
				<Skeleton className="h-6 w-96 bg-muted/30" />
			</div>

			{/* Catalog Cards Grid */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="relative overflow-hidden rounded-lg border-2 border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-4 hover:shadow-lg transition-all duration-300">
						{/* Particule décorative */}
						<div className="absolute top-2 right-2 w-1 h-1 bg-secondary rounded-full opacity-40" aria-hidden="true" />
						<div className="flex items-start justify-between">
							<Skeleton className="h-12 w-12 rounded-lg bg-primary/20 border border-primary/30" />
							<Skeleton className="h-6 w-16 rounded-full bg-muted/30" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-6 w-32 bg-primary/30" />
							<Skeleton className="h-4 w-full bg-muted/30" />
						</div>
						<Skeleton className="h-10 w-full bg-primary/30 rounded-md shadow-md" />
					</div>
				))}
			</div>
		</div>
	);
}
