import type { DashboardPeriod } from "../constants/period.constants";
import type { PeriodBoundaries } from "../types/dashboard.types";
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

// `getChartConfig` est parti au Lot 4 S3.5 (2026-08-03) avec les sparklines —
// les courbes vivent dans le dashboard Stripe.
