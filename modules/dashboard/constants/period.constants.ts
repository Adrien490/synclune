// ============================================================================
// DASHBOARD PERIOD CONFIGURATION
// ============================================================================

export type DashboardPeriod = "7d" | "30d" | "month" | "quarter" | "year";

export type ChartGranularity = "daily" | "weekly" | "monthly";

export type PeriodConfig = {
	label: string;
	chartGranularity: ChartGranularity;
};

export const DASHBOARD_PERIODS: Record<DashboardPeriod, PeriodConfig> = {
	"7d": { label: "7 jours", chartGranularity: "daily" },
	"30d": { label: "30 jours", chartGranularity: "daily" },
	month: { label: "Ce mois", chartGranularity: "daily" },
	quarter: { label: "Ce trimestre", chartGranularity: "weekly" },
	year: { label: "Cette annee", chartGranularity: "monthly" },
} as const;

export const DEFAULT_PERIOD: DashboardPeriod = "month";

export const PERIOD_SEARCH_PARAM = "period";

export const COMPARISON_LABELS: Record<DashboardPeriod, string> = {
	"7d": "vs 7j precedents",
	"30d": "vs 30j precedents",
	month: "vs mois dernier",
	quarter: "vs trimestre dernier",
	year: "vs annee derniere",
};

/**
 * Parses and validates a period string from URL search params
 * Returns DEFAULT_PERIOD for invalid or missing values
 */
export function parsePeriod(raw: string | undefined): DashboardPeriod {
	if (raw && raw in DASHBOARD_PERIODS) return raw as DashboardPeriod;
	return DEFAULT_PERIOD;
}
