"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { PeriodSelector } from "./period-selector";
import { RefreshDashboardButton } from "./refresh-dashboard-button";
import {
	COMPARISON_LABELS,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
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

	return (
		<div className={cn("space-y-3", className)}>
			<h1 className="text-xl font-semibold tracking-wide">Tableau de bord</h1>
			<div className="flex items-center gap-2">
				<div className="flex-1">
					<PeriodSelector fullWidth />
				</div>
				<RefreshDashboardButton variant="outline" />
			</div>
			<p className="text-muted-foreground text-xs">{COMPARISON_LABELS[period]}</p>
		</div>
	);
}
