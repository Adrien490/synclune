"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { ComparisonModeSelector } from "./comparison-mode-selector";
import { ExportDashboardButton } from "./export-dashboard-button";
import { PeriodSelector } from "./period-selector";
import { RefreshDashboardButton } from "./refresh-dashboard-button";
import {
	COMPARISON_MODE_SEARCH_PARAM,
	DEFAULT_COMPARISON_MODE,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	getComparisonLabel,
	type ComparisonMode,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

interface DashboardMobileHeaderProps {
	className?: string;
}

/** Scroll threshold beyond which the header collapses to its compact row only */
const COLLAPSE_SCROLL_THRESHOLD = 140;
/** Minimum scroll-delta to register direction (debounces jittery scroll reports) */
const SCROLL_DIRECTION_EPSILON = 3;
/** Scroll position below which the header always stays expanded */
const EXPAND_NEAR_TOP = 40;

/**
 * Mobile-only dashboard header with period selector, comparison mode and refresh button.
 * Visible on screens < md where PageHeader is hidden.
 *
 * Sticky below the admin mobile top bar so it stays visible while scrolling the KPIs.
 * Auto-collapses the tabs + comparison rows when the user scrolls down past ~140px so
 * the content zone is maximised; re-expands on any scroll-up or when near the top.
 * iOS Safari pattern, respects `prefers-reduced-motion` via `motion-safe:`.
 */
export function DashboardMobileHeader({ className }: DashboardMobileHeaderProps) {
	const searchParams = useSearchParams();
	const period = (searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD) as DashboardPeriod;
	const comparisonMode = (searchParams.get(COMPARISON_MODE_SEARCH_PARAM) ??
		DEFAULT_COMPARISON_MODE) as ComparisonMode;

	const [isCollapsed, setIsCollapsed] = useState(false);
	const lastScrollY = useRef(0);

	useEffect(() => {
		if (typeof window === "undefined") return;

		function onScroll() {
			const y = window.scrollY;
			const delta = y - lastScrollY.current;

			if (y <= EXPAND_NEAR_TOP) {
				setIsCollapsed(false);
			} else if (delta > SCROLL_DIRECTION_EPSILON && y > COLLAPSE_SCROLL_THRESHOLD) {
				setIsCollapsed(true);
			} else if (delta < -SCROLL_DIRECTION_EPSILON) {
				setIsCollapsed(false);
			}

			lastScrollY.current = y;
		}

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div
			className={cn(
				"bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 space-y-3 border-b pt-3 pb-3 backdrop-blur-sm",
				"mx-[calc(var(--admin-main-x,1.5rem)*-1)] px-[var(--admin-main-x,1.5rem)]",
				"motion-safe:transition-[padding] motion-safe:duration-200 motion-safe:ease-out",
				isCollapsed && "pb-1",
				className,
			)}
			data-collapsed={isCollapsed || undefined}
		>
			<div className="flex items-center justify-between gap-2">
				<h1
					className={cn(
						"font-semibold tracking-wide",
						"motion-safe:transition-[font-size] motion-safe:duration-200",
						isCollapsed ? "text-base" : "text-xl",
					)}
				>
					Tableau de bord
				</h1>
				<div className="flex items-center gap-1.5">
					<ExportDashboardButton variant="ghost" iconOnly />
					<RefreshDashboardButton variant="ghost" iconOnly />
				</div>
			</div>
			<div
				className={cn(
					"motion-safe:transition-[max-height,opacity,margin] motion-safe:duration-200 motion-safe:ease-out",
					"overflow-hidden",
					isCollapsed ? "pointer-events-none max-h-0 opacity-0" : "max-h-40 space-y-3 opacity-100",
				)}
				aria-hidden={isCollapsed || undefined}
			>
				<PeriodSelector variant="segmented" />
				<div className="flex items-center gap-2">
					<ComparisonModeSelector variant="segmented" />
					<p className="text-muted-foreground shrink-0 text-[11px] leading-tight">
						{getComparisonLabel(period, comparisonMode)}
					</p>
				</div>
			</div>
		</div>
	);
}
