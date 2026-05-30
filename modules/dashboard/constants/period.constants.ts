// ============================================================================
// DASHBOARD PERIOD CONFIGURATION
// ============================================================================

export type DashboardPeriod = "7d" | "30d" | "month" | "quarter" | "year";

export type ChartGranularity = "daily" | "weekly" | "monthly";

type PeriodConfig = {
	label: string;
	chartGranularity: ChartGranularity;
};

export const DASHBOARD_PERIODS: Record<DashboardPeriod, PeriodConfig> = {
	"7d": { label: "7 jours", chartGranularity: "daily" },
	"30d": { label: "30 jours", chartGranularity: "daily" },
	month: { label: "Ce mois", chartGranularity: "daily" },
	quarter: { label: "Ce trimestre", chartGranularity: "weekly" },
	year: { label: "Cette année", chartGranularity: "monthly" },
} as const;

/**
 * Short labels for the mobile segmented control (must fit in ~70px at 375px viewport)
 */
export const DASHBOARD_PERIODS_SHORT: Record<DashboardPeriod, string> = {
	"7d": "7j",
	"30d": "30j",
	month: "Mois",
	quarter: "Trim.",
	year: "Année",
} as const;

export const DEFAULT_PERIOD: DashboardPeriod = "month";

export const PERIOD_SEARCH_PARAM = "period";

export const COMPARISON_LABELS: Record<DashboardPeriod, string> = {
	"7d": "vs 7j précédents",
	"30d": "vs 30j précédents",
	month: "vs mois dernier",
	quarter: "vs trimestre dernier",
	year: "vs année dernière",
};

// ============================================================================
// COMPARISON MODE (previous period vs same period last year)
// ============================================================================

export type ComparisonMode = "previous" | "yoy";

export const DEFAULT_COMPARISON_MODE: ComparisonMode = "previous";

export const COMPARISON_SEARCH_PARAM = "comparison";

export const YOY_COMPARISON_LABELS: Record<DashboardPeriod, string> = {
	"7d": "vs N-1 (7j)",
	"30d": "vs N-1 (30j)",
	month: "vs même mois N-1",
	quarter: "vs même trimestre N-1",
	year: "vs année N-1",
};

export const COMPARISON_MODE_LABELS: Record<ComparisonMode, string> = {
	previous: "Période précédente",
	yoy: "Année précédente",
};

/**
 * Short labels for the mobile segmented control (parity with DASHBOARD_PERIODS_SHORT)
 */
export const COMPARISON_MODE_SHORT_LABELS: Record<ComparisonMode, string> = {
	previous: "Préc.",
	yoy: "N-1",
};

/**
 * Parses and validates a period string from URL search params
 * Returns DEFAULT_PERIOD for invalid or missing values
 */
export function parsePeriod(raw: string | undefined): DashboardPeriod {
	if (raw && raw in DASHBOARD_PERIODS) return raw as DashboardPeriod;
	return DEFAULT_PERIOD;
}

/**
 * Parses and validates a comparison mode string from URL search params
 * Returns DEFAULT_COMPARISON_MODE for invalid or missing values
 */
export function parseComparisonMode(raw: string | undefined): ComparisonMode {
	if (raw === "yoy" || raw === "previous") return raw;
	return DEFAULT_COMPARISON_MODE;
}

/**
 * Returns the comparison label for a given period + mode
 */
export function getComparisonLabel(period: DashboardPeriod, mode: ComparisonMode): string {
	return mode === "yoy" ? YOY_COMPARISON_LABELS[period] : COMPARISON_LABELS[period];
}

// ============================================================================
// CHART MODE (revenue chart : simple vs detailed breakdown)
// ============================================================================

export type ChartMode = "simple" | "detailed";

export const DEFAULT_CHART_MODE: ChartMode = "simple";

export const CHART_MODE_SEARCH_PARAM = "chartMode";

/**
 * Parses and validates a chart mode string from URL search params.
 * Returns DEFAULT_CHART_MODE for invalid or missing values.
 */
export function parseChartMode(raw: string | undefined): ChartMode {
	if (raw === "detailed" || raw === "simple") return raw;
	return DEFAULT_CHART_MODE;
}
