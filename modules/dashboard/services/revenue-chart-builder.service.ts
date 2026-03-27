import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { RevenueDataPoint, RevenueRow } from "../types/dashboard.types";

// ============================================================================
// REVENUE CHART BUILDER SERVICE
// Pure functions for building revenue chart data
// ============================================================================

/**
 * Converts SQL result rows to Maps of revenue and orders by date
 * Handles bigint -> number conversion
 */
export function buildRevenueMap(rows: RevenueRow[]): {
	revenueMap: Map<string, number>;
	ordersMap: Map<string, number>;
} {
	const revenueMap = new Map<string, number>();
	const ordersMap = new Map<string, number>();

	for (const row of rows) {
		revenueMap.set(row.date, Number(row.revenue));
		ordersMap.set(row.date, Number(row.orders));
	}

	return { revenueMap, ordersMap };
}

/**
 * Fills missing days with 0 values for both revenue and orders
 * Transforms raw data into a continuous time series
 */
export function fillMissingDates(
	revenueMap: Map<string, number>,
	ordersMap: Map<string, number>,
	startDate: Date,
	days: number,
): RevenueDataPoint[] {
	const data: RevenueDataPoint[] = [];

	for (let i = 0; i < days; i++) {
		const date = addDays(startDate, i);
		const dateKey = date.toISOString().split("T")[0]!;
		data.push({
			date: dateKey,
			revenue: revenueMap.get(dateKey) ?? 0,
			orders: ordersMap.get(dateKey) ?? 0,
		});
	}

	return data;
}

/**
 * Formats data with human-readable French date labels
 * Pre-computes labels server-side to avoid 30x new Date() on client
 */
export function formatChartData(
	data: RevenueDataPoint[],
): Array<{ date: string; revenue: number; orders: number }> {
	return data.map((item) => ({
		date: format(new Date(item.date), "dd MMM", { locale: fr }),
		revenue: item.revenue,
		orders: item.orders,
	}));
}
