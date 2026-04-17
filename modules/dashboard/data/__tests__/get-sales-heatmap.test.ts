import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockPrismaQueryRaw, mockCacheDashboard } = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDashboard: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { $queryRaw: mockPrismaQueryRaw },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDashboard,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		SALES_HEATMAP: "dashboard-sales-heatmap",
	},
}));

import { fetchSalesHeatmap } from "../get-sales-heatmap";

describe("fetchSalesHeatmap", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns the expected shape", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		const result = await fetchSalesHeatmap();

		expect(result).toHaveProperty("cells");
		expect(result).toHaveProperty("maxCount");
		expect(result).toHaveProperty("totalOrders");
		expect(result).toHaveProperty("totalRevenue");
		expect(result).toHaveProperty("periodLabel");
	});

	it("calls cacheDashboard with SALES_HEATMAP tag", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		await fetchSalesHeatmap();

		expect(mockCacheDashboard).toHaveBeenCalledWith("dashboard-sales-heatmap");
	});

	it("returns 168 cells (7 days × 24 hours) even with empty data", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		const result = await fetchSalesHeatmap();

		expect(result.cells).toHaveLength(168);
		expect(result.maxCount).toBe(0);
		expect(result.totalOrders).toBe(0);
		expect(result.totalRevenue).toBe(0);
	});

	it("aggregates non-empty data into cells", async () => {
		mockPrismaQueryRaw.mockResolvedValue([
			{ dow: 1, hour: 14, count: BigInt(5), revenue: BigInt(15000) },
			{ dow: 5, hour: 20, count: BigInt(3), revenue: BigInt(8500) },
		]);

		const result = await fetchSalesHeatmap();

		expect(result.cells).toHaveLength(168);
		expect(result.maxCount).toBe(5);
		expect(result.totalOrders).toBe(8);
		expect(result.totalRevenue).toBe(23500);

		const monday2pm = result.cells.find((c) => c.dayOfWeek === 1 && c.hour === 14);
		const friday8pm = result.cells.find((c) => c.dayOfWeek === 5 && c.hour === 20);
		expect(monday2pm?.count).toBe(5);
		expect(friday8pm?.count).toBe(3);
	});

	it("returns the period label", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		const result = await fetchSalesHeatmap("year");

		expect(typeof result.periodLabel).toBe("string");
		expect(result.periodLabel.length).toBeGreaterThan(0);
	});

	it("makes exactly 1 raw SQL query", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		await fetchSalesHeatmap();

		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1);
	});

	it("accepts different period values", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		await expect(fetchSalesHeatmap("7d")).resolves.toBeDefined();
		mockPrismaQueryRaw.mockResolvedValue([]);
		await expect(fetchSalesHeatmap("month")).resolves.toBeDefined();
	});
});
