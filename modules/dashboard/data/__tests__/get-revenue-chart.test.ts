import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrismaQueryRaw,
	mockCacheDefault,
	mockCacheTag,
	mockBuildRevenueMap,
	mockFillMissingDates,
	mockFormatChartData,
	mockGetChartConfig,
} = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDefault: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildRevenueMap: vi.fn(),
	mockFillMissingDates: vi.fn(),
	mockFormatChartData: vi.fn(),
	mockGetChartConfig: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockPrismaQueryRaw,
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
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

vi.mock("@/modules/dashboard/constants/period.constants", () => ({
	DASHBOARD_PERIODS: {
		"7d": { label: "7 jours", chartGranularity: "daily" },
		"30d": { label: "30 jours", chartGranularity: "daily" },
		month: { label: "Ce mois", chartGranularity: "daily" },
		quarter: { label: "Ce trimestre", chartGranularity: "weekly" },
		year: { label: "Cette année", chartGranularity: "monthly" },
	},
	DEFAULT_PERIOD: "month",
}));

vi.mock("@/modules/dashboard/services/period-boundaries.service", () => ({
	getChartConfig: mockGetChartConfig,
}));

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

const DEFAULT_START_DATE = new Date("2026-02-01T00:00:00.000Z");
const DEFAULT_CHART_CONFIG = {
	startDate: DEFAULT_START_DATE,
	pointCount: 15,
	granularity: "daily" as const,
	sqlDateFormat: "YYYY-MM-DD",
};

function makeRevenueRows(count = 3) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2026-02-${String(i + 1).padStart(2, "0")}`,
		revenue: BigInt((i + 1) * 1000),
		orders: BigInt(i + 1),
	}));
}

function makeChartPoints(count = 15, startRevenue = 0) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2026-02-${String(i + 1).padStart(2, "0")}`,
		revenue: startRevenue + i * 500,
		orders: i + 1,
		subtotal: 0,
		discounts: 0,
		shipping: 0,
	}));
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardRevenueChart", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockGetChartConfig.mockReturnValue(DEFAULT_CHART_CONFIG);

		const defaultRows = makeRevenueRows();
		const defaultMaps = {
			revenueMap: new Map([["2026-02-01", 1000]]),
			ordersMap: new Map([["2026-02-01", 2]]),
			subtotalMap: new Map<string, number>(),
			discountsMap: new Map<string, number>(),
			shippingMap: new Map<string, number>(),
		};
		const defaultPoints = makeChartPoints(15);
		const defaultFormatted = defaultPoints.map((p) => ({ ...p, date: `formatted-${p.date}` }));

		mockPrismaQueryRaw.mockResolvedValue(defaultRows);
		mockBuildRevenueMap.mockReturnValue(defaultMaps);
		mockFillMissingDates.mockReturnValue(defaultPoints);
		mockFormatChartData.mockReturnValue(defaultFormatted);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with data and periodLabel properties", async () => {
		const result = await fetchDashboardRevenueChart();

		expect(result).toHaveProperty("data");
		expect(result).toHaveProperty("periodLabel");
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("should return the periodLabel from DASHBOARD_PERIODS config", async () => {
		const result = await fetchDashboardRevenueChart("month");

		expect(result.periodLabel).toBe("Ce mois");
	});

	it("should return correct periodLabel for 7d period", async () => {
		mockGetChartConfig.mockReturnValue({ ...DEFAULT_CHART_CONFIG, pointCount: 7 });

		const result = await fetchDashboardRevenueChart("7d");

		expect(result.periodLabel).toBe("7 jours");
	});

	it("should return the data produced by formatChartData", async () => {
		const rawPoints = makeChartPoints(2);
		const formattedPoints = rawPoints.map((p) => ({ ...p, date: `formatted-${p.date}` }));
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
	// Period configuration
	// -------------------------------------------------------------------------

	it("should call getChartConfig with the provided period", async () => {
		await fetchDashboardRevenueChart("quarter");

		expect(mockGetChartConfig).toHaveBeenCalledWith("quarter");
	});

	it("should default to month period when no argument provided", async () => {
		await fetchDashboardRevenueChart();

		expect(mockGetChartConfig).toHaveBeenCalledWith("month");
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

	// -------------------------------------------------------------------------
	// Service interaction: fillMissingDates
	// -------------------------------------------------------------------------

	it("should pass maps, startDate, pointCount, and granularity to fillMissingDates", async () => {
		const maps = {
			revenueMap: new Map([["2026-02-01", 5000]]),
			ordersMap: new Map([["2026-02-01", 2]]),
			subtotalMap: new Map<string, number>(),
			discountsMap: new Map<string, number>(),
			shippingMap: new Map<string, number>(),
		};
		mockBuildRevenueMap.mockReturnValue(maps);

		await fetchDashboardRevenueChart();

		expect(mockFillMissingDates).toHaveBeenCalledWith(maps, DEFAULT_START_DATE, 15, "daily");
	});

	it("should use the chart config from getChartConfig", async () => {
		const customConfig = {
			startDate: new Date("2026-01-01T00:00:00.000Z"),
			pointCount: 12,
			granularity: "monthly" as const,
			sqlDateFormat: "YYYY-MM",
		};
		mockGetChartConfig.mockReturnValue(customConfig);

		await fetchDashboardRevenueChart("year");

		expect(mockFillMissingDates).toHaveBeenCalledWith(
			expect.any(Object),
			customConfig.startDate,
			12,
			"monthly",
		);
	});

	it("should call fillMissingDates exactly once", async () => {
		await fetchDashboardRevenueChart();

		expect(mockFillMissingDates).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// Service interaction: formatChartData
	// -------------------------------------------------------------------------

	it("should pass the result of fillMissingDates and granularity to formatChartData", async () => {
		const rawPoints = makeChartPoints(10);
		mockFillMissingDates.mockReturnValue(rawPoints);

		await fetchDashboardRevenueChart();

		expect(mockFormatChartData).toHaveBeenCalledWith(rawPoints, "daily");
	});

	it("should pass weekly granularity to formatChartData for quarter period", async () => {
		mockGetChartConfig.mockReturnValue({
			...DEFAULT_CHART_CONFIG,
			granularity: "weekly",
			sqlDateFormat: "IYYY-IW",
		});

		await fetchDashboardRevenueChart("quarter");

		expect(mockFormatChartData).toHaveBeenCalledWith(expect.any(Array), "weekly");
	});

	it("should call formatChartData exactly once", async () => {
		await fetchDashboardRevenueChart();

		expect(mockFormatChartData).toHaveBeenCalledTimes(1);
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

	it("should add a per-granularity secondary cache tag", async () => {
		mockGetChartConfig.mockReturnValue({
			...DEFAULT_CHART_CONFIG,
			granularity: "daily",
		});
		await fetchDashboardRevenueChart("30d");
		expect(mockCacheTag).toHaveBeenCalledWith("dashboard-revenue-chart-daily");
	});

	it("should differentiate cache tag for weekly granularity", async () => {
		mockGetChartConfig.mockReturnValue({
			...DEFAULT_CHART_CONFIG,
			granularity: "weekly",
		});
		await fetchDashboardRevenueChart("quarter");
		expect(mockCacheTag).toHaveBeenCalledWith("dashboard-revenue-chart-weekly");
	});

	it("should differentiate cache tag for monthly granularity", async () => {
		mockGetChartConfig.mockReturnValue({
			...DEFAULT_CHART_CONFIG,
			granularity: "monthly",
		});
		await fetchDashboardRevenueChart("year");
		expect(mockCacheTag).toHaveBeenCalledWith("dashboard-revenue-chart-monthly");
	});
});
