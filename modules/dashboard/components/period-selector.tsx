"use client";

import {
	DASHBOARD_PERIODS,
	DASHBOARD_PERIODS_SHORT,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";
import { UrlSelectControl, type UrlSelectOption } from "./url-select-control";

/**
 * URL-based period selector for the admin dashboard.
 * Updates ?period= search param, triggering server-side data refetch.
 * Thin wrapper over `UrlSelectControl`.
 */
interface PeriodSelectorProps {
	/** Render full-width trigger (for mobile select variant) */
	fullWidth?: boolean;
	/** Visual variant — select dropdown (default) or inline segmented control */
	variant?: "select" | "segmented";
}

const PERIOD_OPTIONS: UrlSelectOption[] = (Object.keys(DASHBOARD_PERIODS) as DashboardPeriod[]).map(
	(value) => ({
		value,
		label: DASHBOARD_PERIODS[value].label,
		shortLabel: DASHBOARD_PERIODS_SHORT[value],
	}),
);

export function PeriodSelector({ fullWidth, variant }: PeriodSelectorProps) {
	return (
		<UrlSelectControl
			options={PERIOD_OPTIONS}
			searchParam={PERIOD_SEARCH_PARAM}
			defaultValue={DEFAULT_PERIOD}
			ariaLabel="Période du tableau de bord"
			variant={variant}
			fullWidth={fullWidth}
			triggerWidthClassName="w-36"
			segmentedColsClassName="grid-cols-5"
		/>
	);
}
