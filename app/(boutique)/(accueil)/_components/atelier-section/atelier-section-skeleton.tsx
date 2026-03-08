import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { processSteps } from "./process-steps";

/**
 * Skeleton for the merged AtelierSection.
 * Matches the real layout to avoid CLS.
 */
export function AtelierSectionSkeleton() {
	return (
		<section
			className={`bg-muted/20 relative overflow-hidden mask-t-from-97% mask-t-to-100% mask-b-from-97% mask-b-to-100% ${SECTION_SPACING.spacious}`}
			aria-label="Chargement de la section atelier"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<div className="mb-10 text-center lg:mb-14">
					<Skeleton className="bg-muted/50 mx-auto h-10 w-48 sm:h-12" />
					<Skeleton className="bg-muted/30 mx-auto mt-5 h-5 w-56" />
				</div>

				{/* Confession text skeleton */}
				<div className="mx-auto max-w-3xl space-y-4 text-center sm:space-y-6">
					<Skeleton className="bg-muted/50 mx-auto h-10 w-full max-w-md sm:h-12" />
					<div className="space-y-4 sm:space-y-6">
						<div className="space-y-2">
							<Skeleton className="bg-muted/30 h-5 w-full" />
							<Skeleton className="bg-muted/30 mx-auto h-5 w-3/4" />
						</div>
						<div className="space-y-2">
							<Skeleton className="bg-muted/30 h-5 w-full" />
							<Skeleton className="bg-muted/30 h-5 w-full" />
							<Skeleton className="bg-muted/30 mx-auto h-5 w-5/6" />
						</div>
						<div className="space-y-2">
							<Skeleton className="bg-muted/30 h-5 w-full" />
							<Skeleton className="bg-muted/30 h-5 w-full" />
							<Skeleton className="bg-muted/30 mx-auto h-5 w-4/5" />
						</div>
					</div>
					<Skeleton className="bg-muted/30 mx-auto mt-4 h-8 w-24" />
				</div>

				{/* Sparkles divider skeleton */}
				<div
					className="my-8 hidden items-center justify-center gap-3 sm:my-12 sm:flex"
					aria-hidden="true"
				>
					<Skeleton className="bg-muted/30 h-4 w-4 rounded-full" />
					<Skeleton className="bg-muted/40 h-5 w-5 rounded-full" />
					<Skeleton className="bg-muted/30 h-4 w-4 rounded-full" />
				</div>

				{/* Timeline skeleton */}
				<div className="mt-8 sm:mt-12">
					{/* Desktop: horizontal 4 columns */}
					<div className="hidden lg:grid lg:grid-cols-4 lg:gap-6">
						{Array.from({ length: processSteps.length }).map((_, i) => (
							<div key={i} className="text-center">
								<Skeleton className="bg-muted/40 mx-auto h-12 w-12 rounded-full" />
								<Skeleton className="bg-muted/50 mx-auto mt-4 h-5 w-32" />
								<Skeleton className="bg-muted/30 mt-2 h-4 w-full" />
								<Skeleton className="bg-muted/30 mx-auto mt-1 h-4 w-5/6" />
							</div>
						))}
					</div>

					{/* Mobile: vertical */}
					<div className="space-y-8 sm:space-y-12 lg:hidden">
						{Array.from({ length: processSteps.length }).map((_, i) => (
							<div key={i} className="flex items-start gap-4">
								<Skeleton className="bg-muted/40 h-12 w-12 shrink-0 rounded-full" />
								<div className="flex-1 space-y-2 pb-8">
									<Skeleton className="bg-muted/50 h-6 w-40" />
									<Skeleton className="bg-muted/30 h-5 w-full" />
									<Skeleton className="bg-muted/30 h-5 w-5/6" />
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Polaroid gallery skeleton */}
				<div className="mt-12 sm:mt-16">
					<div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 min-[400px]:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-2">
						<Skeleton className="bg-muted/40 aspect-4/3 w-full rounded-xl" />
						<Skeleton className="bg-muted/40 aspect-4/3 w-full rounded-xl" />
						<Skeleton className="bg-muted/40 hidden aspect-4/3 w-full rounded-xl lg:block" />
						<Skeleton className="bg-muted/40 hidden aspect-4/3 w-full rounded-xl lg:block" />
					</div>
				</div>

				{/* CTA skeleton */}
				<div className="mt-12 text-center sm:mt-16">
					<Skeleton className="bg-muted/30 mx-auto h-5 w-56" />
					<Skeleton className="bg-muted/40 mx-auto mt-4 h-11 w-64 rounded-md" />
				</div>
			</div>
		</section>
	);
}
