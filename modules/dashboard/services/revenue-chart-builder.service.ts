import { addDays, addMonths, addWeeks, format, startOfISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { RevenueDataPoint, RevenueRow } from "../types/dashboard.types";
import type { ChartGranularity } from "../constants/period.constants";
import { parisDateKey } from "@/shared/utils/timezone";

// ============================================================================
// REVENUE CHART BUILDER SERVICE
// Pure functions for building revenue chart data
// ============================================================================

type RevenueMaps = {
	revenueMap: Map<string, number>;
	ordersMap: Map<string, number>;
	subtotalMap: Map<string, number>;
	discountsMap: Map<string, number>;
	shippingMap: Map<string, number>;
};

/**
 * Converts SQL result rows to Maps by date
 * Handles bigint -> number conversion
 */
export function buildRevenueMap(rows: RevenueRow[]): RevenueMaps {
	const revenueMap = new Map<string, number>();
	const ordersMap = new Map<string, number>();
	const subtotalMap = new Map<string, number>();
	const discountsMap = new Map<string, number>();
	const shippingMap = new Map<string, number>();

	for (const row of rows) {
		revenueMap.set(row.date, Number(row.revenue));
		ordersMap.set(row.date, Number(row.orders));
		subtotalMap.set(row.date, Number(row.subtotal));
		discountsMap.set(row.date, Number(row.discounts));
		shippingMap.set(row.date, Number(row.shipping));
	}

	return { revenueMap, ordersMap, subtotalMap, discountsMap, shippingMap };
}

/**
 * Generates a date key for a given date and granularity
 */
function getDateKey(date: Date, granularity: ChartGranularity): string {
	switch (granularity) {
		case "daily":
			// Clé en heure de Paris pour matcher TO_CHAR(... AT TIME ZONE 'Europe/Paris') SQL.
			return parisDateKey(date);
		case "weekly": {
			// ISO week de la date *locale Paris* (ancrage midi UTC pour lever toute ambiguïté).
			const parisNoon = new Date(`${parisDateKey(date)}T12:00:00Z`);
			const weekStart = startOfISOWeek(parisNoon);
			const isoYear = format(weekStart, "RRRR", { locale: fr });
			const isoWeek = format(weekStart, "II", { locale: fr });
			return `${isoYear}-${isoWeek}`;
		}
		case "monthly":
			// "YYYY-MM" dérivé de la date locale Paris.
			return parisDateKey(date).slice(0, 7);
	}
}

/**
 * Advances a date by one unit of the given granularity
 */
function advanceDate(date: Date, granularity: ChartGranularity): Date {
	switch (granularity) {
		case "daily":
			return addDays(date, 1);
		case "weekly":
			return addWeeks(date, 1);
		case "monthly":
			return addMonths(date, 1);
	}
}

/**
 * Fills missing time periods with 0 values for all metrics
 * Transforms raw data into a continuous time series
 * Supports daily, weekly, and monthly granularity
 */
export function fillMissingDates(
	maps: RevenueMaps,
	startDate: Date,
	count: number,
	granularity: ChartGranularity = "daily",
): RevenueDataPoint[] {
	const data: RevenueDataPoint[] = [];
	let current = granularity === "weekly" ? startOfISOWeek(startDate) : new Date(startDate);

	for (let i = 0; i < count; i++) {
		const dateKey = getDateKey(current, granularity);
		data.push({
			date: dateKey,
			revenue: maps.revenueMap.get(dateKey) ?? 0,
			orders: maps.ordersMap.get(dateKey) ?? 0,
			subtotal: maps.subtotalMap.get(dateKey) ?? 0,
			discounts: maps.discountsMap.get(dateKey) ?? 0,
			shipping: maps.shippingMap.get(dateKey) ?? 0,
		});
		current = advanceDate(current, granularity);
	}

	return data;
}
