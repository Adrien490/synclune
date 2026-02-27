import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton for the merged AtelierSection.
 * Matches the real layout to avoid CLS.
 */
export function AtelierSectionSkeleton() {
	return (
		<section
			className={`relative overflow-hidden bg-muted/20 mask-t-from-90% mask-t-to-100% mask-b-from-85% mask-b-to-100% ${SECTION_SPACING.spacious}`}
			aria-label="Chargement de la section atelier"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<div className="mb-10 text-center lg:mb-14">
					<Skeleton className="h-10 sm:h-12 w-48 mx-auto bg-muted/50" />
					<Skeleton className="h-5 w-56 mx-auto mt-5 bg-muted/30" />
				</div>

				{/* Confession text skeleton */}
				<div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
					<Skeleton className="h-10 sm:h-12 w-full max-w-md mx-auto bg-muted/50" />
					<div className="space-y-4 sm:space-y-6">
						<div className="space-y-2">
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-3/4 mx-auto bg-muted/30" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-5/6 mx-auto bg-muted/30" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-4/5 mx-auto bg-muted/30" />
						</div>
					</div>
					<Skeleton className="h-8 w-24 mx-auto bg-muted/30 mt-4" />
				</div>

				{/* Sparkles divider skeleton */}
				<div
					className="hidden sm:flex justify-center items-center gap-3 my-8 sm:my-12"
					aria-hidden="true"
				>
					<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
					<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
					<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
				</div>

				{/* Timeline skeleton */}
				<div className="mt-8 sm:mt-12">
					{/* Desktop: horizontal 4 columns */}
					<div className="hidden lg:grid lg:grid-cols-4 lg:gap-6">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="text-center">
								<Skeleton className="w-12 h-12 rounded-full mx-auto bg-muted/40" />
								<Skeleton className="h-5 w-32 mx-auto mt-4 bg-muted/50" />
								<Skeleton className="h-4 w-full mt-2 bg-muted/30" />
								<Skeleton className="h-4 w-5/6 mx-auto mt-1 bg-muted/30" />
							</div>
						))}
					</div>

					{/* Mobile: vertical */}
					<div className="lg:hidden space-y-8 sm:space-y-12">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex items-start gap-4">
								<Skeleton className="shrink-0 w-12 h-12 rounded-full bg-muted/40" />
								<div className="flex-1 space-y-2 pb-8">
									<Skeleton className="h-6 w-40 bg-muted/50" />
									<Skeleton className="h-5 w-full bg-muted/30" />
									<Skeleton className="h-5 w-5/6 bg-muted/30" />
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Polaroid gallery skeleton */}
				<div className="mt-12 sm:mt-16">
					<div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-2 max-w-5xl mx-auto">
						<Skeleton className="w-full aspect-4/3 rounded-xl bg-muted/40" />
						<Skeleton className="w-full aspect-4/3 rounded-xl bg-muted/40" />
						<Skeleton className="hidden lg:block w-full aspect-4/3 rounded-xl bg-muted/40" />
						<Skeleton className="hidden lg:block w-full aspect-4/3 rounded-xl bg-muted/40" />
					</div>
				</div>

				{/* CTA skeleton */}
				<div className="mt-12 sm:mt-16 text-center">
					<Skeleton className="h-5 w-56 mx-auto bg-muted/30" />
					<Skeleton className="h-11 w-64 mx-auto mt-4 rounded-md bg-muted/40" />
				</div>
			</div>
		</section>
	);
}
