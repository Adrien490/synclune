import { Skeleton } from "@/shared/components/ui/skeleton";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";

/**
 * Skeleton aligné sur InstagramTeaser : visuel atelier 4/5–5/6 + badge handle overlay,
 * chip "Sur Instagram", h2 titre, underline, sous-titre, 2 bullets, CTA pill.
 * Réserve la hauteur réelle pour éviter le CLS entre AtelierSection et HomeFaq.
 */
export function InstagramTeaserSkeleton() {
	return (
		<section
			aria-hidden="true"
			className={cn(
				"bg-background relative overflow-hidden",
				"mask-t-from-95% mask-t-to-100% mask-b-from-95% mask-b-to-100% sm:mask-t-from-90% sm:mask-b-from-90%",
				SECTION_SPACING.section,
			)}
			data-testid="instagram-teaser-skeleton"
		>
			<div className={CONTAINER_CLASS}>
				<div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
					{/* Visual side skeleton */}
					<div className="relative mx-auto w-full max-w-md lg:max-w-none">
						<div className="relative shadow-md">
							<Skeleton className="bg-muted aspect-[4/5] w-full rounded-2xl sm:aspect-[5/6]" />
							<Skeleton className="bg-muted/60 absolute right-4 bottom-4 h-7 w-36 rounded-full" />
						</div>
					</div>

					{/* Editorial side skeleton */}
					<div className="flex flex-col gap-5 text-center lg:text-left">
						{/* Chip "Sur Instagram" */}
						<Skeleton className="bg-muted/40 mx-auto h-4 w-32 lg:mx-0" />

						{/* Title h2 */}
						<Skeleton className="bg-muted/50 mx-auto h-9 w-80 max-w-full sm:h-10 lg:mx-0" />

						{/* Underline */}
						<Skeleton className="bg-muted/30 mx-auto h-2 w-32 lg:mx-0" />

						{/* Subtitle (2 lines) */}
						<div className="space-y-2">
							<Skeleton className="bg-muted/30 mx-auto h-5 w-full max-w-md lg:mx-0" />
							<Skeleton className="bg-muted/30 mx-auto h-5 w-5/6 max-w-md lg:mx-0" />
						</div>

						{/* Bullets (2 items) */}
						<div className="mx-auto space-y-2 pl-5 lg:mx-0">
							<Skeleton className="bg-muted/30 h-4 w-64 max-w-full" />
							<Skeleton className="bg-muted/30 h-4 w-72 max-w-full" />
						</div>

						{/* CTA pill */}
						<Skeleton className="bg-muted/40 mx-auto mt-2 h-12 w-56 rounded-full lg:mx-0" />
					</div>
				</div>
			</div>
		</section>
	);
}
