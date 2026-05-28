import type { DashboardPeriod } from "../constants/period.constants";
import { DASHBOARD_PERIODS } from "../constants/period.constants";
import type { PeriodBoundaries, ChartConfig } from "../types/dashboard.types";
import { getParisDateParts, parisWallTimeToUtc } from "@/shared/utils/timezone";

// ============================================================================
// PERIOD BOUNDARIES SERVICE
// Pure functions for computing date ranges from a DashboardPeriod
//
// Toutes les bornes sont calées sur l'heure murale de Paris (Europe/Paris) puis
// converties en instant UTC : le CA mensuel/annuel d'une micro-entreprise
// française se compte en heure locale, pas en UTC (ANALYTICS-AUDIT-005).
// ============================================================================

/**
 * Shifts a date by exactly one year backwards (UTC), preserving month, day,
 * hour, minute, second and millisecond. Handles leap-year edge case (Feb 29).
 */
function shiftOneYearBackward(date: Date): Date {
	const shifted = new Date(date);
	shifted.setUTCFullYear(shifted.getUTCFullYear() - 1);
	return shifted;
}

/**
 * Computes current, previous and previous-year date boundaries for KPI comparisons
 */
export function getPeriodBoundaries(period: DashboardPeriod): PeriodBoundaries {
	const now = new Date();
	const { year, month, day: date } = getParisDateParts(now);

	let base: Omit<PeriodBoundaries, "previousYearStart" | "previousYearEnd">;

	switch (period) {
		case "7d":
			base = {
				currentStart: parisWallTimeToUtc(year, month, date - 7),
				currentEnd: now,
				previousStart: parisWallTimeToUtc(year, month, date - 14),
				previousEnd: parisWallTimeToUtc(year, month, date - 7),
			};
			break;

		case "30d":
			base = {
				currentStart: parisWallTimeToUtc(year, month, date - 30),
				currentEnd: now,
				previousStart: parisWallTimeToUtc(year, month, date - 60),
				previousEnd: parisWallTimeToUtc(year, month, date - 30),
			};
			break;

		case "month":
			base = {
				currentStart: parisWallTimeToUtc(year, month, 1),
				currentEnd: now,
				previousStart: parisWallTimeToUtc(year, month - 1, 1),
				previousEnd: parisWallTimeToUtc(year, month, 0, 23, 59, 59, 999),
			};
			break;

		case "quarter": {
			const currentQuarter = Math.floor(month / 3);
			const quarterStart = parisWallTimeToUtc(year, currentQuarter * 3, 1);
			const prevQuarterStart = parisWallTimeToUtc(year, (currentQuarter - 1) * 3, 1);
			const prevQuarterEnd = parisWallTimeToUtc(year, currentQuarter * 3, 0, 23, 59, 59, 999);
			base = {
				currentStart: quarterStart,
				currentEnd: now,
				previousStart: prevQuarterStart,
				previousEnd: prevQuarterEnd,
			};
			break;
		}

		case "year":
			base = {
				currentStart: parisWallTimeToUtc(year, 0, 1),
				currentEnd: now,
				previousStart: parisWallTimeToUtc(year - 1, 0, 1),
				previousEnd: parisWallTimeToUtc(year - 1, 11, 31, 23, 59, 59, 999),
			};
			break;
	}

	return {
		...base,
		previousYearStart: shiftOneYearBackward(base.currentStart),
		previousYearEnd: shiftOneYearBackward(base.currentEnd),
	};
}

/**
 * Returns chart configuration for a given period
 * Includes start date, number of points, granularity, and SQL date format
 */
export function getChartConfig(period: DashboardPeriod): ChartConfig {
	const now = new Date();
	const { year, month, day: date } = getParisDateParts(now);
	const { chartGranularity } = DASHBOARD_PERIODS[period];

	const SQL_DATE_FORMATS = {
		daily: "YYYY-MM-DD",
		weekly: "IYYY-IW",
		monthly: "YYYY-MM",
	} as const;

	switch (period) {
		case "7d":
			return {
				startDate: parisWallTimeToUtc(year, month, date - 7),
				pointCount: 7,
				granularity: chartGranularity,
				sqlDateFormat: SQL_DATE_FORMATS[chartGranularity],
			};

		case "30d":
			return {
				startDate: parisWallTimeToUtc(year, month, date - 30),
				pointCount: 30,
				granularity: chartGranularity,
				sqlDateFormat: SQL_DATE_FORMATS[chartGranularity],
			};

		case "month": {
			const monthStart = parisWallTimeToUtc(year, month, 1);
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
			const quarterStart = parisWallTimeToUtc(year, currentQuarter * 3, 1);
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
			const yearStart = parisWallTimeToUtc(year, 0, 1);
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
