import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Diamond-layout placeholders for the hero's floating product images.
 *
 * Shared between the global `HeroSectionSkeleton` (first render via
 * `loading.tsx`) and the `HeroSection` Suspense fallback (re-fetch post-
 * hydratation). Single source of truth for the breakpoint-driven positions.
 */
export function HeroFloatingImagesSkeleton() {
	return (
		<div className="absolute inset-0 z-0 hidden md:block" aria-hidden="true">
			{/* Top-left — large (tabletVisible) */}
			<Skeleton className="bg-muted/30 absolute top-[12%] left-[2%] aspect-[4/5] w-32 -rotate-8 rounded-2xl md:w-36 lg:w-40 xl:left-[4%] xl:w-48 2xl:w-56" />
			{/* Top-right — medium (desktop only) */}
			<Skeleton className="bg-muted/30 absolute top-[8%] right-[3%] hidden aspect-[4/5] w-32 rotate-5 rounded-2xl lg:block xl:right-[5%] xl:w-40 2xl:w-48" />
			{/* Bottom-left — small (desktop only) */}
			<Skeleton className="bg-muted/30 absolute bottom-[14%] left-[12%] hidden aspect-[4/5] w-28 rotate-3 rounded-2xl lg:block xl:left-[14%] xl:w-34 2xl:w-40" />
			{/* Bottom-right — medium (tabletVisible) */}
			<Skeleton className="bg-muted/30 absolute right-[10%] bottom-[18%] aspect-[4/5] w-32 -rotate-4 rounded-2xl md:w-34 lg:w-32 xl:right-[12%] xl:w-38 2xl:w-44" />
		</div>
	);
}
