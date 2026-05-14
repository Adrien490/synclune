import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

interface StickyActionBarSkeletonProps {
	itemCount?: number;
	stickyTopVar?: string;
	className?: string;
}

/**
 * Skeleton placeholder for the mobile `<StickyActionBar>` rendered by admin list
 * pages (products, orders, refunds, etc.). Reserves the exact vertical footprint
 * (h-11 + border-b) under the AdminMobileHeader so the loading state matches the
 * hydrated page (CLS < 0.05). Mirrors the real bar's sticky positioning, full-bleed
 * `-mx`, and `md:hidden` gate.
 */
export function StickyActionBarSkeleton({
	itemCount = 3,
	stickyTopVar = "--admin-header-height",
	className,
}: StickyActionBarSkeletonProps) {
	return (
		<div
			aria-hidden="true"
			style={{ top: `var(${stickyTopVar},3.5rem)` }}
			className={cn(
				"bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border/50 sticky z-30 -mx-[var(--admin-main-x,1.5rem)] border-b backdrop-blur-md md:hidden",
				className,
			)}
		>
			<div className="divide-border/30 flex items-stretch divide-x pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
				{Array.from({ length: itemCount }).map((_, i) => (
					<div key={i} className="flex h-11 flex-1 items-center justify-center gap-1.5 px-2">
						<Skeleton className="size-4 rounded" />
						<Skeleton className="h-3 w-12" />
					</div>
				))}
			</div>
		</div>
	);
}
