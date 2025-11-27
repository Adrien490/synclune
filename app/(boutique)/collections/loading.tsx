import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for collections list page
 * Covers: Header, collections grid
 */
export default function CollectionsLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement des collections"
		>
			<span className="sr-only">Chargement des collections...</span>

			{/* Page Header Skeleton - Uses PageHeader component */}
			<div className="pt-16 sm:pt-20">
				<section className="bg-background border-b border-border">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="space-y-2">
							{/* Breadcrumbs */}
							<nav className="text-sm">
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-16 bg-muted/40" />
									<span className="text-muted-foreground">/</span>
									<Skeleton className="h-4 w-32 bg-muted/40" />
								</div>
							</nav>

							{/* Title */}
							<Skeleton className="h-8 sm:h-9 w-56 bg-muted/50" />
						</div>
					</div>
				</section>
			</div>

			{/* Main Content */}
			<section className="bg-background py-8">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Collections Grid Skeleton */}
					<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="space-y-4">
								{/* Collection image */}
								<div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30">
									<Skeleton className="absolute inset-0 from-muted/50 via-muted/30 to-transparent" />
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="h-12 w-12 rounded-full border-4 border-muted/60 border-t-primary/40 animate-spin" />
									</div>
								</div>

								{/* Collection name */}
								<Skeleton className="h-6 w-full bg-muted/40" />

								{/* Collection description */}
								<Skeleton className="h-4 w-full bg-muted/30" />
								<Skeleton className="h-4 w-2/3 bg-muted/30" />
							</div>
						))}
					</div>

					{/* Pagination Skeleton */}
					<div className="flex justify-end mt-12">
						<div className="flex items-center gap-2">
							<Skeleton className="h-10 w-24 bg-muted/30" />
							<Skeleton className="h-10 w-24 bg-muted/30" />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
