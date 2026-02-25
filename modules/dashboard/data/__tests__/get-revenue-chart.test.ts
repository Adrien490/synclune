import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrismaQueryRaw,
	mockCacheDashboard,
	mockBuildRevenueMap,
	mockFillMissingDates,
} = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDashboard: vi.fn(),
	mockBuildRevenueMap: vi.fn(),
	mockFillMissingDates: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockPrismaQueryRaw,
	},
}))

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}))

vi.mock("@/modules/dashboard/constants/cache", () => ({
	cacheDashboard: mockCacheDashboard,
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}))

// Must use the absolute alias path so Vitest resolves it to the same module
// that get-revenue-chart.ts imports via its relative "../services/..." path.
vi.mock("@/modules/dashboard/services/revenue-chart-builder.service", () => ({
	buildRevenueMap: mockBuildRevenueMap,
	fillMissingDates: mockFillMissingDates,
}))

import { fetchDashboardRevenueChart } from "../get-revenue-chart"

// ============================================================================
// HELPERS
// ============================================================================

function makeRevenueRows(count = 3) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2026-01-${String(i + 1).padStart(2, "0")}`,
		revenue: BigInt((i + 1) * 1000),
	}))
}

function makeChartPoints(count = 30, startRevenue = 0) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2026-01-${String(i + 1).padStart(2, "0")}`,
		revenue: startRevenue + i * 500,
	}))
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardRevenueChart", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.useFakeTimers()
		// Fix date to 2026-02-15T12:00:00Z for all tests
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"))

		const defaultRows = makeRevenueRows()
		const defaultMap = new Map([["2026-01-16", 1000]])
		const defaultPoints = makeChartPoints(30)

		mockPrismaQueryRaw.mockResolvedValue(defaultRows)
		mockBuildRevenueMap.mockReturnValue(defaultMap)
		mockFillMissingDates.mockReturnValue(defaultPoints)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with a data property", async () => {
		const result = await fetchDashboardRevenueChart()

		expect(result).toHaveProperty("data")
		expect(Array.isArray(result.data)).toBe(true)
	})

	it("should return 30 data points for a standard 30-day chart", async () => {
		mockFillMissingDates.mockReturnValue(makeChartPoints(30))

		const result = await fetchDashboardRevenueChart()

		expect(result.data).toHaveLength(30)
	})

	it("should return the data produced by fillMissingDates", async () => {
		const expectedPoints = [
			{ date: "2026-01-16", revenue: 1000 },
			{ date: "2026-01-17", revenue: 2000 },
		]
		mockFillMissingDates.mockReturnValue(expectedPoints)

		const result = await fetchDashboardRevenueChart()

		expect(result.data).toEqual(expectedPoints)
	})

	it("should return empty data array when fillMissingDates returns empty", async () => {
		mockFillMissingDates.mockReturnValue([])

		const result = await fetchDashboardRevenueChart()

		expect(result.data).toEqual([])
	})

	// -------------------------------------------------------------------------
	// Service interaction: buildRevenueMap
	// -------------------------------------------------------------------------

	it("should pass the raw query result to buildRevenueMap", async () => {
		const rawRows = makeRevenueRows(5)
		mockPrismaQueryRaw.mockResolvedValue(rawRows)

		await fetchDashboardRevenueChart()

		expect(mockBuildRevenueMap).toHaveBeenCalledWith(rawRows)
	})

	it("should call buildRevenueMap exactly once", async () => {
		await fetchDashboardRevenueChart()

		expect(mockBuildRevenueMap).toHaveBeenCalledTimes(1)
	})

	it("should handle empty raw query result by passing empty array to buildRevenueMap", async () => {
		mockPrismaQueryRaw.mockResolvedValue([])
		mockBuildRevenueMap.mockReturnValue(new Map())
		mockFillMissingDates.mockReturnValue(Array.from({ length: 30 }, (_, i) => ({
			date: `2026-01-${String(i + 1).padStart(2, "0")}`,
			revenue: 0,
		})))

		const result = await fetchDashboardRevenueChart()

		expect(mockBuildRevenueMap).toHaveBeenCalledWith([])
		expect(result.data).toHaveLength(30)
		expect(result.data.every((p) => p.revenue === 0)).toBe(true)
	})

	// -------------------------------------------------------------------------
	// Service interaction: fillMissingDates
	// -------------------------------------------------------------------------

	it("should pass the revenue map returned by buildRevenueMap to fillMissingDates", async () => {
		const revenueMap = new Map([["2026-01-20", 5000], ["2026-01-21", 3000]])
		mockBuildRevenueMap.mockReturnValue(revenueMap)

		await fetchDashboardRevenueChart()

		expect(mockFillMissingDates).toHaveBeenCalledWith(
			revenueMap,
			expect.any(Date),
			30
		)
	})

	it("should call fillMissingDates exactly once", async () => {
		await fetchDashboardRevenueChart()

		expect(mockFillMissingDates).toHaveBeenCalledTimes(1)
	})

	it("should pass days=30 to fillMissingDates", async () => {
		await fetchDashboardRevenueChart()

		const [, , days] = mockFillMissingDates.mock.calls[0] as [unknown, unknown, number]
		expect(days).toBe(30)
	})

	// -------------------------------------------------------------------------
	// Date range computation
	// -------------------------------------------------------------------------

	it("should compute thirtyDaysAgo as 30 days before current UTC date", async () => {
		// Fixed time: 2026-02-15T12:00:00Z
		// thirtyDaysAgo = Date.UTC(2026, 1, 15 - 30) = Date.UTC(2026, 1, -15) = 2026-01-16T00:00:00Z
		await fetchDashboardRevenueChart()

		const [, thirtyDaysAgo] = mockFillMissingDates.mock.calls[0] as [unknown, Date]
		const expected = new Date(Date.UTC(2026, 1, 15 - 30))
		expect(thirtyDaysAgo.toISOString()).toBe(expected.toISOString())
	})

	it("should pass a Date instance as the start date to fillMissingDates", async () => {
		await fetchDashboardRevenueChart()

		const [, startDate] = mockFillMissingDates.mock.calls[0] as [unknown, Date]
		expect(startDate).toBeInstanceOf(Date)
	})

	it("should use UTC midnight as the start of the 30-day window", async () => {
		await fetchDashboardRevenueChart()

		const [, startDate] = mockFillMissingDates.mock.calls[0] as [unknown, Date]
		// Should be start of UTC day, not mid-day
		expect(startDate.getUTCHours()).toBe(0)
		expect(startDate.getUTCMinutes()).toBe(0)
		expect(startDate.getUTCSeconds()).toBe(0)
	})

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the REVENUE_CHART tag", async () => {
		await fetchDashboardRevenueChart()

		expect(mockCacheDashboard).toHaveBeenCalledWith("dashboard-revenue-chart")
	})

	it("should call cacheDashboard exactly once", async () => {
		await fetchDashboardRevenueChart()

		expect(mockCacheDashboard).toHaveBeenCalledTimes(1)
	})
})
