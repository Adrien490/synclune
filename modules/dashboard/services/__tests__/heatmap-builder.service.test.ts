import { describe, it, expect } from "vitest";
import {
	HEATMAP_DAYS,
	HEATMAP_HOURS,
	HEATMAP_TOTAL_CELLS,
	buildHeatmapCells,
	computeCellOpacity,
	computeHeatmapStats,
} from "../heatmap-builder.service";
import type { HeatmapRawRow } from "../../types/dashboard.types";

describe("heatmap-builder.service", () => {
	// -------------------------------------------------------------------------
	// Constants
	// -------------------------------------------------------------------------

	describe("constants", () => {
		it("exports the expected dimensions", () => {
			expect(HEATMAP_DAYS).toBe(7);
			expect(HEATMAP_HOURS).toBe(24);
			expect(HEATMAP_TOTAL_CELLS).toBe(168);
		});
	});

	// -------------------------------------------------------------------------
	// buildHeatmapCells
	// -------------------------------------------------------------------------

	describe("buildHeatmapCells", () => {
		it("produces 168 cells when input is empty", () => {
			const cells = buildHeatmapCells([]);

			expect(cells).toHaveLength(168);
			expect(cells.every((c) => c.count === 0 && c.revenue === 0)).toBe(true);
		});

		it("fills cells in deterministic (day, hour) order", () => {
			const cells = buildHeatmapCells([]);

			expect(cells[0]).toEqual({ dayOfWeek: 0, hour: 0, count: 0, revenue: 0 });
			expect(cells[23]).toEqual({ dayOfWeek: 0, hour: 23, count: 0, revenue: 0 });
			expect(cells[24]).toEqual({ dayOfWeek: 1, hour: 0, count: 0, revenue: 0 });
			expect(cells[167]).toEqual({ dayOfWeek: 6, hour: 23, count: 0, revenue: 0 });
		});

		it("populates cells with raw row data when present", () => {
			const rows: HeatmapRawRow[] = [
				{ dow: 1, hour: 14, count: BigInt(5), revenue: BigInt(15000) },
				{ dow: 5, hour: 20, count: BigInt(3), revenue: BigInt(8500) },
			];

			const cells = buildHeatmapCells(rows);

			const monday2pm = cells.find((c) => c.dayOfWeek === 1 && c.hour === 14);
			const friday8pm = cells.find((c) => c.dayOfWeek === 5 && c.hour === 20);
			expect(monday2pm).toEqual({ dayOfWeek: 1, hour: 14, count: 5, revenue: 15000 });
			expect(friday8pm).toEqual({ dayOfWeek: 5, hour: 20, count: 3, revenue: 8500 });
		});

		it("converts bigint count and revenue to numbers", () => {
			const rows: HeatmapRawRow[] = [
				{ dow: 0, hour: 0, count: BigInt(10), revenue: BigInt(99999) },
			];

			const cells = buildHeatmapCells(rows);
			const cell = cells.find((c) => c.dayOfWeek === 0 && c.hour === 0);

			expect(typeof cell?.count).toBe("number");
			expect(typeof cell?.revenue).toBe("number");
			expect(cell?.count).toBe(10);
			expect(cell?.revenue).toBe(99999);
		});

		it("accepts numeric (not only bigint) input", () => {
			const rows: HeatmapRawRow[] = [{ dow: 2, hour: 10, count: 7, revenue: 21000 }];

			const cells = buildHeatmapCells(rows);
			const cell = cells.find((c) => c.dayOfWeek === 2 && c.hour === 10);

			expect(cell?.count).toBe(7);
			expect(cell?.revenue).toBe(21000);
		});
	});

	// -------------------------------------------------------------------------
	// computeHeatmapStats
	// -------------------------------------------------------------------------

	describe("computeHeatmapStats", () => {
		it("returns 0 stats for empty grid", () => {
			const cells = buildHeatmapCells([]);

			expect(computeHeatmapStats(cells)).toEqual({
				maxCount: 0,
				totalOrders: 0,
				totalRevenue: 0,
			});
		});

		it("returns max, total orders and total revenue across all cells", () => {
			const cells = buildHeatmapCells([
				{ dow: 0, hour: 0, count: 2, revenue: 1000 },
				{ dow: 1, hour: 1, count: 5, revenue: 4000 },
				{ dow: 2, hour: 2, count: 3, revenue: 2500 },
			]);

			const stats = computeHeatmapStats(cells);

			expect(stats.maxCount).toBe(5);
			expect(stats.totalOrders).toBe(10);
			expect(stats.totalRevenue).toBe(7500);
		});
	});

	// -------------------------------------------------------------------------
	// computeCellOpacity
	// -------------------------------------------------------------------------

	describe("computeCellOpacity", () => {
		it("returns 0 when count is 0", () => {
			expect(computeCellOpacity(0, 10)).toBe(0);
		});

		it("returns 0 when maxCount is 0", () => {
			expect(computeCellOpacity(0, 0)).toBe(0);
		});

		it("returns 1 (or near) when count equals maxCount", () => {
			expect(computeCellOpacity(10, 10)).toBeCloseTo(1);
		});

		it("uses sqrt curve to boost low values above raw ratio", () => {
			// Raw ratio 1/16 = 0.0625, sqrt(0.0625) = 0.25 (above the 0.15 floor)
			expect(computeCellOpacity(1, 16)).toBeCloseTo(0.25);
		});

		it("clamps to minimum 0.15 for non-zero counts", () => {
			// sqrt(1/10000) = 0.01 → clamped to 0.15
			expect(computeCellOpacity(1, 10000)).toBe(0.15);
			// sqrt(1/100) = 0.1 → clamped to 0.15
			expect(computeCellOpacity(1, 100)).toBe(0.15);
		});

		it("never exceeds 1", () => {
			expect(computeCellOpacity(50, 100)).toBeLessThanOrEqual(1);
			expect(computeCellOpacity(100, 100)).toBeLessThanOrEqual(1);
		});
	});
});
