import { describe, it, expect } from "vitest";

import {
	buildRevenueMap,
	fillMissingDates,
	formatChartData,
} from "../revenue-chart-builder.service";

// ---------------------------------------------------------------------------
// buildRevenueMap
// ---------------------------------------------------------------------------

describe("buildRevenueMap", () => {
	it("should convert SQL rows to Maps of date -> number for revenue and orders", () => {
		const rows = [
			{
				date: "2026-01-15",
				revenue: BigInt(150000),
				orders: BigInt(3),
				subtotal: BigInt(0),
				discounts: BigInt(0),
				shipping: BigInt(0),
			},
			{
				date: "2026-01-16",
				revenue: BigInt(230000),
				orders: BigInt(5),
				subtotal: BigInt(0),
				discounts: BigInt(0),
				shipping: BigInt(0),
			},
		];

		const { revenueMap, ordersMap } = buildRevenueMap(rows);

		expect(revenueMap).toBeInstanceOf(Map);
		expect(revenueMap.get("2026-01-15")).toBe(150000);
		expect(revenueMap.get("2026-01-16")).toBe(230000);
		expect(ordersMap.get("2026-01-15")).toBe(3);
		expect(ordersMap.get("2026-01-16")).toBe(5);
	});

	it("should handle bigint zero", () => {
		const rows = [
			{
				date: "2026-01-01",
				revenue: BigInt(0),
				orders: BigInt(0),
				subtotal: BigInt(0),
				discounts: BigInt(0),
				shipping: BigInt(0),
			},
		];

		const { revenueMap, ordersMap } = buildRevenueMap(rows);

		expect(revenueMap.get("2026-01-01")).toBe(0);
		expect(ordersMap.get("2026-01-01")).toBe(0);
	});

	it("should handle large bigint values", () => {
		const rows = [
			{
				date: "2026-01-01",
				revenue: BigInt(9_999_999_999),
				orders: BigInt(100),
				subtotal: BigInt(0),
				discounts: BigInt(0),
				shipping: BigInt(0),
			},
		];

		const { revenueMap } = buildRevenueMap(rows);

		expect(revenueMap.get("2026-01-01")).toBe(9_999_999_999);
	});

	it("should return empty Maps for empty input", () => {
		const { revenueMap, ordersMap } = buildRevenueMap([]);

		expect(revenueMap.size).toBe(0);
		expect(ordersMap.size).toBe(0);
	});

	it("should overwrite duplicate dates with the last value", () => {
		const rows = [
			{
				date: "2026-01-01",
				revenue: BigInt(100),
				orders: BigInt(1),
				subtotal: BigInt(0),
				discounts: BigInt(0),
				shipping: BigInt(0),
			},
			{
				date: "2026-01-01",
				revenue: BigInt(200),
				orders: BigInt(2),
				subtotal: BigInt(0),
				discounts: BigInt(0),
				shipping: BigInt(0),
			},
		];

		const { revenueMap, ordersMap } = buildRevenueMap(rows);

		expect(revenueMap.get("2026-01-01")).toBe(200);
		expect(ordersMap.get("2026-01-01")).toBe(2);
		expect(revenueMap.size).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// fillMissingDates
// ---------------------------------------------------------------------------

describe("fillMissingDates", () => {
	it("should generate a continuous series of the given length", () => {
		const revenueMap = new Map<string, number>();
		const ordersMap = new Map<string, number>();
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(
			{
				revenueMap,
				ordersMap,
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			5,
		);

		expect(result).toHaveLength(5);
		expect(result.map((d) => d.date)).toEqual([
			"2026-01-01",
			"2026-01-02",
			"2026-01-03",
			"2026-01-04",
			"2026-01-05",
		]);
	});

	it("should fill missing dates with 0 revenue and 0 orders", () => {
		const revenueMap = new Map([["2026-01-02", 5000]]);
		const ordersMap = new Map([["2026-01-02", 2]]);
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(
			{
				revenueMap,
				ordersMap,
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			3,
		);

		expect(result).toEqual([
			{ date: "2026-01-01", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-01-02", revenue: 5000, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-01-03", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
		]);
	});

	it("should return an empty array when days is 0", () => {
		const revenueMap = new Map<string, number>();
		const ordersMap = new Map<string, number>();
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(
			{
				revenueMap,
				ordersMap,
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			0,
		);

		expect(result).toEqual([]);
	});

	it("should handle month boundaries correctly", () => {
		const revenueMap = new Map<string, number>();
		const ordersMap = new Map<string, number>();
		const start = new Date(Date.UTC(2026, 0, 30));

		const result = fillMissingDates(
			{
				revenueMap,
				ordersMap,
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			4,
		);

		expect(result.map((d) => d.date)).toEqual([
			"2026-01-30",
			"2026-01-31",
			"2026-02-01",
			"2026-02-02",
		]);
	});

	it("should handle year boundaries correctly", () => {
		const revenueMap = new Map<string, number>();
		const ordersMap = new Map<string, number>();
		const start = new Date(Date.UTC(2025, 11, 30));

		const result = fillMissingDates(
			{
				revenueMap,
				ordersMap,
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			4,
		);

		expect(result.map((d) => d.date)).toEqual([
			"2025-12-30",
			"2025-12-31",
			"2026-01-01",
			"2026-01-02",
		]);
	});

	it("should preserve existing revenue and orders values from the maps", () => {
		const revenueMap = new Map([
			["2026-01-01", 10000],
			["2026-01-03", 25000],
		]);
		const ordersMap = new Map([
			["2026-01-01", 3],
			["2026-01-03", 7],
		]);
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(
			{
				revenueMap,
				ordersMap,
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			3,
		);

		expect(result).toEqual([
			{ date: "2026-01-01", revenue: 10000, orders: 3, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-01-02", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-01-03", revenue: 25000, orders: 7, subtotal: 0, discounts: 0, shipping: 0 },
		]);
	});
});

// ---------------------------------------------------------------------------
// formatChartData
// ---------------------------------------------------------------------------

describe("formatChartData", () => {
	it("should format ISO dates to French day+month labels", () => {
		const data = [
			{ date: "2026-01-15", revenue: 1000, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-02-03", revenue: 2000, orders: 4, subtotal: 0, discounts: 0, shipping: 0 },
		];

		const result = formatChartData(data);

		expect(result[0]!.date).toBe("15 janv.");
		expect(result[1]!.date).toBe("03 févr.");
	});

	it("should preserve revenue and orders values", () => {
		const data = [
			{ date: "2026-01-01", revenue: 5000, orders: 3, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-01-02", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
		];

		const result = formatChartData(data);

		expect(result[0]!.revenue).toBe(5000);
		expect(result[0]!.orders).toBe(3);
		expect(result[1]!.revenue).toBe(0);
		expect(result[1]!.orders).toBe(0);
	});

	it("should return empty array for empty input", () => {
		const result = formatChartData([]);

		expect(result).toEqual([]);
	});
});
