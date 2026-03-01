import { SECTION_SPACING } from "@/shared/constants/spacing";

function ReviewCardSkeleton() {
	return (
		<div className="bg-card space-y-3 overflow-hidden rounded-lg border-2 border-transparent p-4 shadow-sm">
			{/* Name + badge */}
			<div className="flex items-center gap-2">
				<div className="bg-muted h-5 w-24 rounded motion-safe:animate-pulse" />
				<div className="bg-muted/50 h-5 w-20 rounded motion-safe:animate-pulse" />
			</div>
			{/* Stars + date */}
			<div className="flex items-center gap-2">
				<div className="bg-muted h-4 w-20 rounded motion-safe:animate-pulse" />
				<div className="bg-muted/50 h-4 w-16 rounded motion-safe:animate-pulse" />
			</div>
			{/* Content */}
			<div className="space-y-2">
				<div className="bg-muted/50 h-4 w-full rounded motion-safe:animate-pulse" />
				<div className="bg-muted/50 h-4 w-3/4 rounded motion-safe:animate-pulse" />
			</div>
			{/* Product thumbnail + link */}
			<div className="flex items-center gap-2 pt-1">
				<div className="bg-muted size-10 rounded-md motion-safe:animate-pulse" />
				<div className="bg-muted/40 h-3 w-28 rounded motion-safe:animate-pulse" />
			</div>
		</div>
	);
}

/**
 * Skeleton for the ReviewsSection — matches the real layout to avoid CLS.
 */
export function ReviewsSectionSkeleton() {
	return (
		<section
			className={`bg-background relative overflow-hidden ${SECTION_SPACING.section}`}
			aria-label="Chargement des avis clients"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="mb-8 text-center lg:mb-12">
					<div className="bg-muted mx-auto h-10 w-72 rounded motion-safe:animate-pulse" />
					<div className="bg-muted/50 mx-auto mt-4 h-7 w-full max-w-lg rounded motion-safe:animate-pulse" />
					{/* Aggregate rating skeleton */}
					<div className="mt-4 flex items-center justify-center gap-2">
						<div className="bg-muted h-5 w-24 rounded motion-safe:animate-pulse" />
						<div className="bg-muted/50 h-5 w-16 rounded motion-safe:animate-pulse" />
					</div>
				</header>

				{/* Mobile: single card skeleton + dots */}
				<div className="mb-6 sm:mb-8 lg:hidden">
					<div className="flex justify-center">
						<div className="w-[clamp(260px,80vw,340px)]">
							<ReviewCardSkeleton />
						</div>
					</div>
					{/* Dots placeholder */}
					<div className="mt-4 flex justify-center gap-1.5">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="bg-muted size-2 rounded-full motion-safe:animate-pulse" />
						))}
					</div>
				</div>

				{/* Desktop: Grid skeleton */}
				<div className="mb-12 hidden grid-cols-3 gap-6 lg:grid">
					{Array.from({ length: 6 }).map((_, i) => (
						<ReviewCardSkeleton key={i} />
					))}
				</div>

				{/* CTA skeleton */}
				<div className="text-center">
					<div className="bg-muted mx-auto h-12 w-56 rounded-md motion-safe:animate-pulse" />
				</div>
			</div>
		</section>
	);
}
