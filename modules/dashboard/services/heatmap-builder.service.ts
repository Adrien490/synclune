import type { HeatmapCell, HeatmapRawRow } from "../types/dashboard.types";

// ============================================================================
// HEATMAP BUILDER SERVICE
// Pure functions building a 7×24 sales heatmap from raw SQL aggregates
// ============================================================================

export const HEATMAP_DAYS = 7;
export const HEATMAP_HOURS = 24;
export const HEATMAP_TOTAL_CELLS = HEATMAP_DAYS * HEATMAP_HOURS; // 168

/**
 * Build a fully populated 7×24 grid of heatmap cells from aggregated rows.
 * Missing (dow, hour) buckets are filled with zero count/revenue.
 */
export function buildHeatmapCells(rows: HeatmapRawRow[]): HeatmapCell[] {
	const map = new Map<string, HeatmapRawRow>();
	for (const row of rows) {
		map.set(`${row.dow}-${row.hour}`, row);
	}

	const cells: HeatmapCell[] = [];
	for (let day = 0; day < HEATMAP_DAYS; day++) {
		for (let hour = 0; hour < HEATMAP_HOURS; hour++) {
			const row = map.get(`${day}-${hour}`);
			cells.push({
				dayOfWeek: day,
				hour,
				count: row ? Number(row.count) : 0,
				revenue: row ? Number(row.revenue) : 0,
			});
		}
	}
	return cells;
}

/**
 * Computes max count, total orders and total revenue across all cells.
 * Used to drive opacity scale and summary display.
 */
export function computeHeatmapStats(cells: HeatmapCell[]): {
	maxCount: number;
	totalOrders: number;
	totalRevenue: number;
} {
	let maxCount = 0;
	let totalOrders = 0;
	let totalRevenue = 0;
	for (const cell of cells) {
		if (cell.count > maxCount) maxCount = cell.count;
		totalOrders += cell.count;
		totalRevenue += cell.revenue;
	}
	return { maxCount, totalOrders, totalRevenue };
}

/**
 * Returns a 0..1 opacity for a cell, given the max count in the dataset.
 * Cells with 0 count return 0 (rendered transparent / muted).
 */
export function computeCellOpacity(count: number, maxCount: number): number {
	if (count === 0 || maxCount === 0) return 0;
	const ratio = count / maxCount;
	// Boost low values so they remain visible (sqrt curve)
	return Math.max(0.15, Math.sqrt(ratio));
}
