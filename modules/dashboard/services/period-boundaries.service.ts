import type { DashboardPeriod } from "../constants/period.constants";
import { DASHBOARD_PERIODS } from "../constants/period.constants";
import type { PeriodBoundaries, ChartConfig } from "../types/dashboard.types";

// ============================================================================
// PERIOD BOUNDARIES SERVICE
// Pure functions for computing date ranges from a DashboardPeriod
// ============================================================================

/**
 * Computes current and previous period date boundaries for KPI comparisons
 */
export function getPeriodBoundaries(period: DashboardPeriod): PeriodBoundaries {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();
	const date = now.getUTCDate();

	switch (period) {
		case "7d":
			return {
				currentStart: new Date(Date.UTC(year, month, date - 7)),
				currentEnd: now,
				previousStart: new Date(Date.UTC(year, month, date - 14)),
				previousEnd: new Date(Date.UTC(year, month, date - 7)),
			};

		case "30d":
			return {
				currentStart: new Date(Date.UTC(year, month, date - 30)),
				currentEnd: now,
				previousStart: new Date(Date.UTC(year, month, date - 60)),
				previousEnd: new Date(Date.UTC(year, month, date - 30)),
			};

		case "month":
			return {
				currentStart: new Date(Date.UTC(year, month, 1)),
				currentEnd: now,
				previousStart: new Date(Date.UTC(year, month - 1, 1)),
				previousEnd: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
			};

		case "quarter": {
			const currentQuarter = Math.floor(month / 3);
			const quarterStart = new Date(Date.UTC(year, currentQuarter * 3, 1));
			const prevQuarterStart = new Date(Date.UTC(year, (currentQuarter - 1) * 3, 1));
			const prevQuarterEnd = new Date(Date.UTC(year, currentQuarter * 3, 0, 23, 59, 59, 999));
			return {
				currentStart: quarterStart,
				currentEnd: now,
				previousStart: prevQuarterStart,
				previousEnd: prevQuarterEnd,
			};
		}

		case "year":
			return {
				currentStart: new Date(Date.UTC(year, 0, 1)),
				currentEnd: now,
				previousStart: new Date(Date.UTC(year - 1, 0, 1)),
				previousEnd: new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999)),
			};
	}
}

/**
 * Returns chart configuration for a given period
 * Includes start date, number of points, granularity, and SQL date format
 */
export function getChartConfig(period: DashboardPeriod): ChartConfig {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();
	const date = now.getUTCDate();
	const { chartGranularity } = DASHBOARD_PERIODS[period];

	const SQL_DATE_FORMATS = {
		daily: "YYYY-MM-DD",
		weekly: "IYYY-IW",
		monthly: "YYYY-MM",
	} as const;

	switch (period) {
		case "7d":
			return {
				startDate: new Date(Date.UTC(year, month, date - 7)),
				pointCount: 7,
				granularity: chartGranularity,
				sqlDateFormat: SQL_DATE_FORMATS[chartGranularity],
			};

		case "30d":
			return {
				startDate: new Date(Date.UTC(year, month, date - 30)),
				pointCount: 30,
				granularity: chartGranularity,
				sqlDateFormat: SQL_DATE_FORMATS[chartGranularity],
			};

		case "month": {
			const monthStart = new Date(Date.UTC(year, month, 1));
			const daysElapsed = date;
			return {
				startDate: monthStart,
				pointCount: daysElapsed,
				granularity: chartGranularity,
				sqlDateFormat: SQL_DATE_FORMATS[chartGranularity],
			};
		}

		case "quarter": {
			const currentQuarter = Math.floor(month / 3);
			const quarterStart = new Date(Date.UTC(year, currentQuarter * 3, 1));
			const daysSinceQuarterStart = Math.ceil(
				(now.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24),
			);
			const weeksElapsed = Math.ceil(daysSinceQuarterStart / 7);
			return {
				startDate: quarterStart,
				pointCount: weeksElapsed,
				granularity: chartGranularity,
				sqlDateFormat: SQL_DATE_FORMATS[chartGranularity],
			};
		}

		case "year": {
			const yearStart = new Date(Date.UTC(year, 0, 1));
			const monthsElapsed = month + 1;
			return {
				startDate: yearStart,
				pointCount: monthsElapsed,
				granularity: chartGranularity,
				sqlDateFormat: SQL_DATE_FORMATS[chartGranularity],
			};
		}
	}
}
