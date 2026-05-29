import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

interface StickyActionBarSkeletonProps {
	/**
	 * Number of action buttons to mirror. In `withSearch` mode this is the count
	 * of icon buttons rendered AFTER the search field (i.e. excluding search).
	 */
	itemCount?: number;
	/**
	 * Mirror the compact layout: a persistent search-input skeleton (flex-1) +
	 * `itemCount` icon-square buttons. Must match the bottom-bar's `search` slot.
	 */
	withSearch?: boolean;
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
	withSearch = false,
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
			{withSearch ? (
				<div className="flex items-center gap-1 py-1.5 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))]">
					<Skeleton className="h-11 min-w-0 flex-1 rounded-md" />
					{Array.from({ length: itemCount }).map((_, i) => (
						<Skeleton key={i} className="size-11 shrink-0 rounded-md" />
					))}
				</div>
			) : (
				<div className="divide-border/30 flex items-stretch divide-x pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
					{Array.from({ length: itemCount }).map((_, i) => (
						<div key={i} className="flex h-11 flex-1 items-center justify-center gap-1.5 px-2">
							<Skeleton className="size-4 rounded" />
							<Skeleton className="h-3 w-12" />
						</div>
					))}
				</div>
			)}
		</div>
	);
}
