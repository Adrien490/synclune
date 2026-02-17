import { describe, it, expect } from "vitest";

import {
	buildRevenueMap,
	fillMissingDates,
} from "../revenue-chart-builder.service";

// ---------------------------------------------------------------------------
// buildRevenueMap
// ---------------------------------------------------------------------------

describe("buildRevenueMap", () => {
	it("should convert SQL rows to a Map of date -> number", () => {
		const rows = [
			{ date: "2026-01-15", revenue: 150000n },
			{ date: "2026-01-16", revenue: 230000n },
		];

		const result = buildRevenueMap(rows);

		expect(result).toBeInstanceOf(Map);
		expect(result.get("2026-01-15")).toBe(150000);
		expect(result.get("2026-01-16")).toBe(230000);
	});

	it("should handle bigint zero", () => {
		const rows = [{ date: "2026-01-01", revenue: 0n }];

		const result = buildRevenueMap(rows);

		expect(result.get("2026-01-01")).toBe(0);
	});

	it("should handle large bigint values", () => {
		const rows = [{ date: "2026-01-01", revenue: 9_999_999_999n }];

		const result = buildRevenueMap(rows);

		expect(result.get("2026-01-01")).toBe(9_999_999_999);
	});

	it("should return an empty Map for empty input", () => {
		const result = buildRevenueMap([]);

		expect(result.size).toBe(0);
	});

	it("should overwrite duplicate dates with the last value", () => {
		const rows = [
			{ date: "2026-01-01", revenue: 100n },
			{ date: "2026-01-01", revenue: 200n },
		];

		const result = buildRevenueMap(rows);

		expect(result.get("2026-01-01")).toBe(200);
		expect(result.size).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// fillMissingDates
// ---------------------------------------------------------------------------

describe("fillMissingDates", () => {
	it("should generate a continuous series of the given length", () => {
		const revenueMap = new Map<string, number>();
		const start = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01

		const result = fillMissingDates(revenueMap, start, 5);

		expect(result).toHaveLength(5);
		expect(result.map((d) => d.date)).toEqual([
			"2026-01-01",
			"2026-01-02",
			"2026-01-03",
			"2026-01-04",
			"2026-01-05",
		]);
	});

	it("should fill missing dates with 0 revenue", () => {
		const revenueMap = new Map([["2026-01-02", 5000]]);
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(revenueMap, start, 3);

		expect(result).toEqual([
			{ date: "2026-01-01", revenue: 0 },
			{ date: "2026-01-02", revenue: 5000 },
			{ date: "2026-01-03", revenue: 0 },
		]);
	});

	it("should return an empty array when days is 0", () => {
		const revenueMap = new Map<string, number>();
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(revenueMap, start, 0);

		expect(result).toEqual([]);
	});

	it("should handle month boundaries correctly", () => {
		const revenueMap = new Map<string, number>();
		const start = new Date(Date.UTC(2026, 0, 30)); // Jan 30

		const result = fillMissingDates(revenueMap, start, 4);

		expect(result.map((d) => d.date)).toEqual([
			"2026-01-30",
			"2026-01-31",
			"2026-02-01",
			"2026-02-02",
		]);
	});

	it("should handle year boundaries correctly", () => {
		const revenueMap = new Map<string, number>();
		const start = new Date(Date.UTC(2025, 11, 30)); // Dec 30 2025

		const result = fillMissingDates(revenueMap, start, 4);

		expect(result.map((d) => d.date)).toEqual([
			"2025-12-30",
			"2025-12-31",
			"2026-01-01",
			"2026-01-02",
		]);
	});

	it("should preserve existing revenue values from the map", () => {
		const revenueMap = new Map([
			["2026-01-01", 10000],
			["2026-01-03", 25000],
		]);
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(revenueMap, start, 3);

		expect(result).toEqual([
			{ date: "2026-01-01", revenue: 10000 },
			{ date: "2026-01-02", revenue: 0 },
			{ date: "2026-01-03", revenue: 25000 },
		]);
	});
});
