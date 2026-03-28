import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { RevenueDataPoint, RevenueRow } from "../types/dashboard.types";

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
 * Fills missing days with 0 values for all metrics
 * Transforms raw data into a continuous time series
 */
export function fillMissingDates(
	maps: RevenueMaps,
	startDate: Date,
	days: number,
): RevenueDataPoint[] {
	const data: RevenueDataPoint[] = [];

	for (let i = 0; i < days; i++) {
		const date = addDays(startDate, i);
		const dateKey = date.toISOString().split("T")[0]!;
		data.push({
			date: dateKey,
			revenue: maps.revenueMap.get(dateKey) ?? 0,
			orders: maps.ordersMap.get(dateKey) ?? 0,
			subtotal: maps.subtotalMap.get(dateKey) ?? 0,
			discounts: maps.discountsMap.get(dateKey) ?? 0,
			shipping: maps.shippingMap.get(dateKey) ?? 0,
		});
	}

	return data;
}

/**
 * Formats data with human-readable French date labels
 * Pre-computes labels server-side to avoid 30x new Date() on client
 */
export function formatChartData(data: RevenueDataPoint[]): RevenueDataPoint[] {
	return data.map((item) => ({
		...item,
		date: format(new Date(item.date), "dd MMM", { locale: fr }),
	}));
}
