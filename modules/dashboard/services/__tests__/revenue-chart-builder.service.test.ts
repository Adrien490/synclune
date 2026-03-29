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

// ---------------------------------------------------------------------------
// fillMissingDates - weekly granularity
// ---------------------------------------------------------------------------

describe("fillMissingDates with granularity 'weekly'", () => {
	it("should generate the correct number of weekly data points", () => {
		const start = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05 (Monday, ISO week 2)

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			4,
			"weekly",
		);

		expect(result).toHaveLength(4);
	});

	it("should use ISO week date keys in format YYYY-WW", () => {
		// 2026-01-05 is Monday of ISO week 2 of 2026
		const start = new Date(Date.UTC(2026, 0, 5));

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			3,
			"weekly",
		);

		expect(result.map((d) => d.date)).toEqual(["2026-02", "2026-03", "2026-04"]);
	});

	it("should fill missing weeks with 0 values", () => {
		// 2026-01-05 is Monday of ISO week 2 of 2026
		const start = new Date(Date.UTC(2026, 0, 5));

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			2,
			"weekly",
		);

		expect(result).toEqual([
			{ date: "2026-02", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-03", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
		]);
	});

	it("should start from the ISO week start (Monday) when given a mid-week date", () => {
		// 2026-01-07 is Wednesday of ISO week 2 of 2026; should snap to Monday 2026-01-05
		const start = new Date(Date.UTC(2026, 0, 7));

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			2,
			"weekly",
		);

		// Week key should be the same as starting from Monday of that same week
		expect(result[0]!.date).toBe("2026-02");
	});

	it("should match revenue values from maps by week key", () => {
		// 2026-01-05 → ISO week "2026-02", 2026-01-12 → ISO week "2026-03"
		const revenueMap = new Map([
			["2026-02", 12000],
			["2026-03", 8000],
		]);
		const ordersMap = new Map([
			["2026-02", 4],
			["2026-03", 2],
		]);
		const start = new Date(Date.UTC(2026, 0, 5));

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
			"weekly",
		);

		expect(result[0]).toEqual({
			date: "2026-02",
			revenue: 12000,
			orders: 4,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		});
		expect(result[1]).toEqual({
			date: "2026-03",
			revenue: 8000,
			orders: 2,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		});
		expect(result[2]).toEqual({
			date: "2026-04",
			revenue: 0,
			orders: 0,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// fillMissingDates - monthly granularity
// ---------------------------------------------------------------------------

describe("fillMissingDates with granularity 'monthly'", () => {
	it("should generate the correct number of monthly data points", () => {
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			12,
			"monthly",
		);

		expect(result).toHaveLength(12);
	});

	it("should use month date keys in format YYYY-MM", () => {
		const start = new Date(Date.UTC(2026, 0, 1));

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			3,
			"monthly",
		);

		expect(result.map((d) => d.date)).toEqual(["2026-01", "2026-02", "2026-03"]);
	});

	it("should fill missing months with 0 values", () => {
		const start = new Date(Date.UTC(2026, 2, 1)); // March 2026

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			2,
			"monthly",
		);

		expect(result).toEqual([
			{ date: "2026-03", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-04", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
		]);
	});

	it("should iterate correctly across a year boundary", () => {
		const start = new Date(Date.UTC(2025, 10, 1)); // November 2025

		const result = fillMissingDates(
			{
				revenueMap: new Map(),
				ordersMap: new Map(),
				subtotalMap: new Map(),
				discountsMap: new Map(),
				shippingMap: new Map(),
			},
			start,
			4,
			"monthly",
		);

		expect(result.map((d) => d.date)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
	});

	it("should match revenue values from maps by month key", () => {
		const revenueMap = new Map([
			["2026-01", 50000],
			["2026-03", 75000],
		]);
		const ordersMap = new Map([
			["2026-01", 10],
			["2026-03", 15],
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
			"monthly",
		);

		expect(result[0]).toEqual({
			date: "2026-01",
			revenue: 50000,
			orders: 10,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		});
		expect(result[1]).toEqual({
			date: "2026-02",
			revenue: 0,
			orders: 0,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		});
		expect(result[2]).toEqual({
			date: "2026-03",
			revenue: 75000,
			orders: 15,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// formatChartData - weekly granularity
// ---------------------------------------------------------------------------

describe("formatChartData with granularity 'weekly'", () => {
	it("should format weekly keys as 'dd MMM' label of the week start (Monday)", () => {
		// ISO week 2026-02: Monday is 2026-01-05
		// ISO week 2026-10: Monday is 2026-03-02
		const data = [
			{ date: "2026-02", revenue: 1000, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-10", revenue: 2000, orders: 4, subtotal: 0, discounts: 0, shipping: 0 },
		];

		const result = formatChartData(data, "weekly");

		expect(result[0]!.date).toBe("05 janv.");
		expect(result[1]!.date).toBe("02 mars");
	});

	it("should handle ISO week 1 which may start in the previous year", () => {
		// ISO week 2026-01: Monday is 2025-12-29
		const data = [
			{ date: "2026-01", revenue: 500, orders: 1, subtotal: 0, discounts: 0, shipping: 0 },
		];

		const result = formatChartData(data, "weekly");

		expect(result[0]!.date).toBe("29 déc.");
	});

	it("should preserve revenue and orders values", () => {
		const data = [
			{ date: "2026-05", revenue: 9500, orders: 7, subtotal: 100, discounts: 50, shipping: 200 },
		];

		const result = formatChartData(data, "weekly");

		expect(result[0]!.revenue).toBe(9500);
		expect(result[0]!.orders).toBe(7);
		expect(result[0]!.subtotal).toBe(100);
		expect(result[0]!.discounts).toBe(50);
		expect(result[0]!.shipping).toBe(200);
	});
});

// ---------------------------------------------------------------------------
// formatChartData - monthly granularity
// ---------------------------------------------------------------------------

describe("formatChartData with granularity 'monthly'", () => {
	it("should format monthly keys as 'MMM yyyy' in French locale", () => {
		const data = [
			{ date: "2026-01", revenue: 1000, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-07", revenue: 2000, orders: 4, subtotal: 0, discounts: 0, shipping: 0 },
		];

		const result = formatChartData(data, "monthly");

		expect(result[0]!.date).toBe("janv. 2026");
		expect(result[1]!.date).toBe("juil. 2026");
	});

	it("should handle December to January transition correctly", () => {
		const data = [
			{ date: "2025-12", revenue: 3000, orders: 5, subtotal: 0, discounts: 0, shipping: 0 },
			{ date: "2026-01", revenue: 1500, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
		];

		const result = formatChartData(data, "monthly");

		expect(result[0]!.date).toBe("déc. 2025");
		expect(result[1]!.date).toBe("janv. 2026");
	});

	it("should preserve revenue and orders values", () => {
		const data = [
			{ date: "2026-03", revenue: 42000, orders: 12, subtotal: 500, discounts: 200, shipping: 300 },
		];

		const result = formatChartData(data, "monthly");

		expect(result[0]!.revenue).toBe(42000);
		expect(result[0]!.orders).toBe(12);
		expect(result[0]!.subtotal).toBe(500);
		expect(result[0]!.discounts).toBe(200);
		expect(result[0]!.shipping).toBe(300);
	});

	it("should return empty array for empty input", () => {
		const result = formatChartData([], "monthly");

		expect(result).toEqual([]);
	});
});
