import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for customer orders page
 * Matches exact structure: Header with icon + title + description, then OrdersList
 */
export default function CustomerOrdersLoading() {
	return (
		<div
			className="min-h-screen py-8 lg:py-12"
			role="status"
			aria-busy="true"
			aria-label="Chargement des commandes"
		>
			<span className="sr-only">Chargement des commandes...</span>

			{/* Header section - Matches page.tsx structure */}
			<section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl mb-8">
				<div className="text-center">
					{/* Icon */}
					<Skeleton className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted/40" />

					{/* Title */}
					<Skeleton className="h-8 lg:h-9 w-48 mx-auto mb-4 bg-muted/50" />

					{/* Subtitle */}
					<Skeleton className="h-7 w-64 mx-auto mb-4 bg-muted/40" />

					{/* Description */}
					<div className="max-w-2xl mx-auto space-y-2">
						<Skeleton className="h-6 w-full bg-muted/30" />
						<Skeleton className="h-6 w-4/5 mx-auto bg-muted/30" />
					</div>
				</div>
			</section>

			{/* Main content section - OrdersList skeleton */}
			<section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
				<div className="space-y-6">
					{/* Orders List */}
					<div className="space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="rounded-lg border border-border bg-card p-6 space-y-4"
							>
								{/* Order Header */}
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
									<div className="space-y-2">
										<Skeleton className="h-5 w-32 bg-muted/50" />
										<Skeleton className="h-4 w-48 bg-muted/30" />
									</div>
									<div className="flex items-center gap-3">
										<Skeleton className="h-6 w-24 rounded-full bg-muted/40" />
										<Skeleton className="h-9 w-28 bg-muted/30 rounded-md" />
									</div>
								</div>

								{/* Order Items */}
								<div className="space-y-3">
									{Array.from({ length: 2 }).map((_, j) => (
										<div key={j} className="flex gap-4">
											<Skeleton className="h-20 w-20 rounded-md bg-muted/40 shrink-0" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-4 w-full bg-muted/50" />
												<Skeleton className="h-3 w-32 bg-muted/30" />
												<Skeleton className="h-4 w-24 bg-muted/40" />
											</div>
										</div>
									))}
								</div>

								{/* Order Footer */}
								<div className="flex justify-between items-center pt-4 border-t border-border">
									<Skeleton className="h-4 w-32 bg-muted/30" />
									<Skeleton className="h-6 w-24 bg-muted/50" />
								</div>
							</div>
						))}
					</div>

					{/* Pagination */}
					<div className="flex justify-center pt-4">
						<div className="flex items-center gap-2">
							<Skeleton className="h-10 w-10 bg-muted/40 rounded-md" />
							<Skeleton className="h-10 w-32 bg-muted/40 rounded-md" />
							<Skeleton className="h-10 w-10 bg-muted/40 rounded-md" />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
