import { SECTION_SPACING } from "@/shared/constants/spacing"

function ReviewCardSkeleton() {
	return (
		<div className="overflow-hidden rounded-lg border bg-card shadow-sm p-4 space-y-3">
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
			{/* Product thumbnail + link */}
			<div className="flex items-center gap-2 pt-1">
				<div className="size-8 rounded bg-muted animate-pulse" />
				<div className="h-3 w-28 bg-muted/40 animate-pulse rounded" />
			</div>
		</div>
	)
}

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

				{/* Mobile: single card skeleton + dots */}
				<div className="lg:hidden mb-6 sm:mb-8">
					<div className="flex justify-center">
						<div className="w-[clamp(260px,80vw,340px)]">
							<ReviewCardSkeleton />
						</div>
					</div>
					{/* Dots placeholder */}
					<div className="flex justify-center gap-1.5 mt-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="size-2 rounded-full bg-muted animate-pulse" />
						))}
					</div>
				</div>

				{/* Desktop: Grid skeleton */}
				<div className="hidden lg:grid grid-cols-3 gap-6 mb-12">
					{Array.from({ length: 6 }).map((_, i) => (
						<ReviewCardSkeleton key={i} />
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
