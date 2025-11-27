import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for Stripe payments/webhook events page
 */
export default function StripePaymentsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des paiements Stripe">
			<span className="sr-only">Chargement des paiements Stripe...</span>

			{/* Page Header */}
			<div className="mb-8 space-y-3">
				<Skeleton className="h-10 w-56 bg-gradient-to-r from-primary/20 to-primary/10" />
				<Skeleton className="h-6 w-96 bg-muted/30" />
			</div>

			<div className="space-y-6">
				{/* Stats Cards */}
				<div className="grid gap-4 md:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="relative overflow-hidden rounded-lg border-l-4 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-transparent p-4 hover:shadow-lg transition-all duration-300">
							{/* Particule décorative */}
							<div className="absolute top-2 right-2 w-1 h-1 bg-secondary rounded-full opacity-40" aria-hidden="true" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-24 bg-muted/40" />
								<Skeleton className="h-7 w-32 bg-primary/20" />
								<Skeleton className="h-3 w-20 bg-muted/30" />
							</div>
						</div>
					))}
				</div>

				{/* Toolbar */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
					<Skeleton className="h-10 flex-1 sm:max-w-md bg-muted/40 rounded-md" />
					<Skeleton className="h-10 w-full sm:w-48 bg-muted/40 rounded-md" />
					<Skeleton className="h-10 w-full sm:w-32 bg-muted/40 rounded-md" />
				</div>

				{/* Data Table */}
				<div className="rounded-lg border-2 border-primary/15 bg-gradient-to-br from-primary/3 to-transparent overflow-hidden">
					{/* Table Header */}
					<div className="border-b-2 border-primary/10 p-4 bg-gradient-to-r from-primary/5 to-transparent">
						<div className="grid grid-cols-12 gap-4 items-center">
							<Skeleton className="h-5 w-24 col-span-2 bg-muted/50" />
							<Skeleton className="h-5 w-32 col-span-2 bg-muted/50" />
							<Skeleton className="h-5 w-20 col-span-2 bg-muted/40" />
							<Skeleton className="h-5 w-20 col-span-2 bg-muted/40" />
							<Skeleton className="h-5 w-24 col-span-3 bg-muted/40" />
							<Skeleton className="h-5 w-8 bg-muted/40" />
						</div>
					</div>

					{/* Table Rows */}
					{Array.from({ length: 15 }).map((_, i) => (
						<div key={i} className="border-b border-border last:border-0 p-4 hover:bg-primary/5 transition-colors">
							<div className="grid grid-cols-12 gap-4 items-center">
								<div className="col-span-2 space-y-2">
									<Skeleton className="h-4 w-full bg-muted/50" />
									<Skeleton className="h-3 w-20 bg-muted/30" />
								</div>
								<Skeleton className="h-4 w-full col-span-2 bg-muted/40" />
								<Skeleton className="h-6 w-20 col-span-2 rounded-full bg-muted/40" />
								<Skeleton className="h-4 w-full col-span-2 bg-muted/40" />
								<div className="col-span-3 space-y-1">
									<Skeleton className="h-3 w-full bg-muted/40" />
									<Skeleton className="h-3 w-3/4 bg-muted/30" />
								</div>
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
