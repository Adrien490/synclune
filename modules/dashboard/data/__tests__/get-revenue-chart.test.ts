import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrismaQueryRaw,
	mockCacheDefault,
	mockBuildRevenueMap,
	mockFillMissingDates,
	mockFormatChartData,
} = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDefault: vi.fn(),
	mockBuildRevenueMap: vi.fn(),
	mockFillMissingDates: vi.fn(),
	mockFormatChartData: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockPrismaQueryRaw,
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDefault,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

// Must use the absolute alias path so Vitest resolves it to the same module
// that get-revenue-chart.ts imports via its relative "../services/..." path.
vi.mock("@/modules/dashboard/services/revenue-chart-builder.service", () => ({
	buildRevenueMap: mockBuildRevenueMap,
	fillMissingDates: mockFillMissingDates,
	formatChartData: mockFormatChartData,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: { PAID: "PAID" },
}));

import { fetchDashboardRevenueChart } from "../get-revenue-chart";

// ============================================================================
// HELPERS
// ============================================================================

function makeRevenueRows(count = 3) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2026-01-${String(i + 1).padStart(2, "0")}`,
		revenue: BigInt((i + 1) * 1000),
		orders: BigInt(i + 1),
	}));
}

function makeChartPoints(count = 30, startRevenue = 0) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2026-01-${String(i + 1).padStart(2, "0")}`,
		revenue: startRevenue + i * 500,
		orders: i + 1,
	}));
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardRevenueChart", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		// Fix date to 2026-02-15T12:00:00Z for all tests
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));

		const defaultRows = makeRevenueRows();
		const defaultRevenueMap = new Map([["2026-01-16", 1000]]);
		const defaultOrdersMap = new Map([["2026-01-16", 2]]);
		const defaultPoints = makeChartPoints(30);
		const defaultFormatted = defaultPoints.map((p) => ({ ...p, date: `formatted-${p.date}` }));

		mockPrismaQueryRaw.mockResolvedValue(defaultRows);
		mockBuildRevenueMap.mockReturnValue({
			revenueMap: defaultRevenueMap,
			ordersMap: defaultOrdersMap,
		});
		mockFillMissingDates.mockReturnValue(defaultPoints);
		mockFormatChartData.mockReturnValue(defaultFormatted);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with a data property", async () => {
		const result = await fetchDashboardRevenueChart();

		expect(result).toHaveProperty("data");
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("should return 30 data points for a standard 30-day chart", async () => {
		const points = makeChartPoints(30);
		mockFillMissingDates.mockReturnValue(points);
		mockFormatChartData.mockReturnValue(points.map((p) => ({ ...p, date: `f-${p.date}` })));

		const result = await fetchDashboardRevenueChart();

		expect(result.data).toHaveLength(30);
	});

	it("should return the data produced by formatChartData", async () => {
		const rawPoints = [
			{ date: "2026-01-16", revenue: 1000 },
			{ date: "2026-01-17", revenue: 2000 },
		];
		const formattedPoints = [
			{ date: "16 janv.", revenue: 1000 },
			{ date: "17 janv.", revenue: 2000 },
		];
		mockFillMissingDates.mockReturnValue(rawPoints);
		mockFormatChartData.mockReturnValue(formattedPoints);

		const result = await fetchDashboardRevenueChart();

		expect(result.data).toEqual(formattedPoints);
	});

	it("should return empty data array when formatChartData returns empty", async () => {
		mockFillMissingDates.mockReturnValue([]);
		mockFormatChartData.mockReturnValue([]);

		const result = await fetchDashboardRevenueChart();

		expect(result.data).toEqual([]);
	});

	// -------------------------------------------------------------------------
	// Service interaction: buildRevenueMap
	// -------------------------------------------------------------------------

	it("should pass the raw query result to buildRevenueMap", async () => {
		const rawRows = makeRevenueRows(5);
		mockPrismaQueryRaw.mockResolvedValue(rawRows);

		await fetchDashboardRevenueChart();

		expect(mockBuildRevenueMap).toHaveBeenCalledWith(rawRows);
	});

	it("should call buildRevenueMap exactly once", async () => {
		await fetchDashboardRevenueChart();

		expect(mockBuildRevenueMap).toHaveBeenCalledTimes(1);
	});

	it("should handle empty raw query result by passing empty array to buildRevenueMap", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);
		mockBuildRevenueMap.mockReturnValue({
			revenueMap: new Map(),
			ordersMap: new Map(),
		});
		const zeroPoints = Array.from({ length: 30 }, (_, i) => ({
			date: `2026-01-${String(i + 1).padStart(2, "0")}`,
			revenue: 0,
			orders: 0,
		}));
		mockFillMissingDates.mockReturnValue(zeroPoints);
		mockFormatChartData.mockReturnValue(zeroPoints);

		const result = await fetchDashboardRevenueChart();

		expect(mockBuildRevenueMap).toHaveBeenCalledWith([]);
		expect(result.data).toHaveLength(30);
		expect(result.data.every((p) => p.revenue === 0)).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Service interaction: fillMissingDates
	// -------------------------------------------------------------------------

	it("should pass the maps returned by buildRevenueMap to fillMissingDates", async () => {
		const maps = {
			revenueMap: new Map([
				["2026-01-20", 5000],
				["2026-01-21", 3000],
			]),
			ordersMap: new Map([
				["2026-01-20", 2],
				["2026-01-21", 1],
			]),
			subtotalMap: new Map<string, number>(),
			discountsMap: new Map<string, number>(),
			shippingMap: new Map<string, number>(),
		};
		mockBuildRevenueMap.mockReturnValue(maps);

		await fetchDashboardRevenueChart();

		expect(mockFillMissingDates).toHaveBeenCalledWith(maps, expect.any(Date), 30);
	});

	it("should call fillMissingDates exactly once", async () => {
		await fetchDashboardRevenueChart();

		expect(mockFillMissingDates).toHaveBeenCalledTimes(1);
	});

	it("should pass days=30 to fillMissingDates", async () => {
		await fetchDashboardRevenueChart();

		const [, , days] = mockFillMissingDates.mock.calls[0] as [unknown, unknown, number];
		expect(days).toBe(30);
	});

	// -------------------------------------------------------------------------
	// Date range computation
	// -------------------------------------------------------------------------

	it("should compute thirtyDaysAgo as 30 days before current UTC date", async () => {
		// Fixed time: 2026-02-15T12:00:00Z
		// thirtyDaysAgo = Date.UTC(2026, 1, 15 - 30) = Date.UTC(2026, 1, -15) = 2026-01-16T00:00:00Z
		await fetchDashboardRevenueChart();

		const [, thirtyDaysAgo] = mockFillMissingDates.mock.calls[0] as [unknown, Date];
		const expected = new Date(Date.UTC(2026, 1, 15 - 30));
		expect(thirtyDaysAgo.toISOString()).toBe(expected.toISOString());
	});

	it("should pass a Date instance as the start date to fillMissingDates", async () => {
		await fetchDashboardRevenueChart();

		const [, startDate] = mockFillMissingDates.mock.calls[0] as [unknown, Date];
		expect(startDate).toBeInstanceOf(Date);
	});

	it("should use UTC midnight as the start of the 30-day window", async () => {
		await fetchDashboardRevenueChart();

		const [, startDate] = mockFillMissingDates.mock.calls[0] as [unknown, Date];
		// Should be start of UTC day, not mid-day
		expect(startDate.getUTCHours()).toBe(0);
		expect(startDate.getUTCMinutes()).toBe(0);
		expect(startDate.getUTCSeconds()).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the REVENUE_CHART tag", async () => {
		await fetchDashboardRevenueChart();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-revenue-chart");
	});

	it("should call cacheDashboard exactly once", async () => {
		await fetchDashboardRevenueChart();

		expect(mockCacheDefault).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// Service interaction: formatChartData
	// -------------------------------------------------------------------------

	it("should pass the result of fillMissingDates to formatChartData", async () => {
		const rawPoints = makeChartPoints(10);
		mockFillMissingDates.mockReturnValue(rawPoints);

		await fetchDashboardRevenueChart();

		expect(mockFormatChartData).toHaveBeenCalledWith(rawPoints);
	});

	it("should call formatChartData exactly once", async () => {
		await fetchDashboardRevenueChart();

		expect(mockFormatChartData).toHaveBeenCalledTimes(1);
	});
});
