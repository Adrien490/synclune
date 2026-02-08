import { SECTION_SPACING } from "@/shared/constants/spacing"

/**
 * Skeleton for the ReviewsSection — matches the real layout to avoid CLS.
 */
export function ReviewsSectionSkeleton() {
	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-label="Chargement des avis clients"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="mb-8 text-center lg:mb-12">
					<div className="h-10 w-72 mx-auto bg-muted animate-pulse rounded" />
					<div className="mt-4 h-7 w-full max-w-lg mx-auto bg-muted/50 animate-pulse rounded" />
					{/* Aggregate rating skeleton */}
					<div className="mt-4 flex items-center justify-center gap-2">
						<div className="h-5 w-24 bg-muted animate-pulse rounded" />
						<div className="h-5 w-16 bg-muted/50 animate-pulse rounded" />
					</div>
				</header>

				{/* Grid skeleton: 6 review cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-12">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="overflow-hidden rounded-lg border bg-card shadow-sm p-4 space-y-3">
							{/* Name + badge */}
							<div className="flex items-center gap-2">
								<div className="h-5 w-24 bg-muted animate-pulse rounded" />
								<div className="h-5 w-20 bg-muted/50 animate-pulse rounded" />
							</div>
							{/* Stars + date */}
							<div className="flex items-center gap-2">
								<div className="h-4 w-20 bg-muted animate-pulse rounded" />
								<div className="h-4 w-16 bg-muted/50 animate-pulse rounded" />
							</div>
							{/* Content */}
							<div className="space-y-2">
								<div className="h-4 w-full bg-muted/50 animate-pulse rounded" />
								<div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded" />
							</div>
							{/* Product link */}
							<div className="h-3 w-28 bg-muted/40 animate-pulse rounded" />
						</div>
					))}
				</div>

				{/* CTA skeleton */}
				<div className="text-center">
					<div className="h-12 w-56 mx-auto bg-muted animate-pulse rounded-md" />
				</div>
			</div>
		</section>
	)
}
