"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { ComparisonModeSelector } from "./comparison-mode-selector";
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

/**
 * Mobile-only dashboard header with period selector and refresh button
 * Visible on screens < md where PageHeader is hidden
 */
export function DashboardMobileHeader({ className }: DashboardMobileHeaderProps) {
	const searchParams = useSearchParams();
	const period = (searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD) as DashboardPeriod;
	const comparisonMode = (searchParams.get(COMPARISON_MODE_SEARCH_PARAM) ??
		DEFAULT_COMPARISON_MODE) as ComparisonMode;

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-center justify-between gap-2">
				<h1 className="text-xl font-semibold tracking-wide">Tableau de bord</h1>
				<RefreshDashboardButton variant="outline" />
			</div>
			<div className="grid grid-cols-2 gap-2">
				<PeriodSelector fullWidth />
				<ComparisonModeSelector fullWidth />
			</div>
			<p className="text-muted-foreground text-xs">{getComparisonLabel(period, comparisonMode)}</p>
		</div>
	);
}
