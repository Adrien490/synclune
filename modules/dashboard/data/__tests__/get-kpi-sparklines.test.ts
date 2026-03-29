import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrismaQueryRaw, mockCacheDefault, mockBuildSparklinePath } = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDefault: vi.fn(),
	mockBuildSparklinePath: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockPrismaQueryRaw,
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDefault,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
	},
}));

vi.mock("@/modules/dashboard/services/kpi-sparkline-builder.service", () => ({
	buildSparklinePath: mockBuildSparklinePath,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: { PAID: "PAID" },
}));

import { fetchKpiSparklines, aggregateIntoBuckets } from "../get-kpi-sparklines";

// ============================================================================
// HELPERS
// ============================================================================

function makeDailyRows(count = 7, baseRevenue = 1000, baseOrders = 2) {
	return Array.from({ length: count }, (_, i) => {
		const d = new Date(Date.UTC(2026, 1, 8 + i)); // 2026-02-08 to 2026-02-14
		return {
			date: d.toISOString().split("T")[0]!,
			revenue: BigInt(baseRevenue * (i + 1)),
			orders: BigInt(baseOrders + i),
		};
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchKpiSparklines", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));

		mockPrismaQueryRaw.mockResolvedValue(makeDailyRows());
		mockBuildSparklinePath
			.mockReturnValueOnce("M 0,28 C 50,28 50,24 100,24") // revenue
			.mockReturnValueOnce("M 0,28 C 50,28 50,20 100,20") // orders
			.mockReturnValueOnce("M 0,28 C 50,28 50,16 100,16"); // aov
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with revenuePath, ordersPath, and aovPath", async () => {
		const result = await fetchKpiSparklines();

		expect(result).toHaveProperty("revenuePath");
		expect(result).toHaveProperty("ordersPath");
		expect(result).toHaveProperty("aovPath");
	});

	it("should return the SVG paths produced by buildSparklinePath", async () => {
		const result = await fetchKpiSparklines();

		expect(result.revenuePath).toBe("M 0,28 C 50,28 50,24 100,24");
		expect(result.ordersPath).toBe("M 0,28 C 50,28 50,20 100,20");
		expect(result.aovPath).toBe("M 0,28 C 50,28 50,16 100,16");
	});

	it("should return null paths when buildSparklinePath returns null", async () => {
		mockBuildSparklinePath.mockReset();
		mockBuildSparklinePath.mockReturnValue(null);

		const result = await fetchKpiSparklines();

		expect(result.revenuePath).toBeNull();
		expect(result.ordersPath).toBeNull();
		expect(result.aovPath).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Service interaction: buildSparklinePath
	// -------------------------------------------------------------------------

	it("should call buildSparklinePath exactly 3 times (revenue, orders, aov)", async () => {
		await fetchKpiSparklines();

		expect(mockBuildSparklinePath).toHaveBeenCalledTimes(3);
	});

	it("should pass a 7-element array of revenues to the first buildSparklinePath call", async () => {
		await fetchKpiSparklines();

		const [revenueValues] = mockBuildSparklinePath.mock.calls[0] as [number[]];
		expect(revenueValues).toHaveLength(7);
	});

	it("should pass a 7-element array of orders to the second buildSparklinePath call", async () => {
		await fetchKpiSparklines();

		const [ordersValues] = mockBuildSparklinePath.mock.calls[1] as [number[]];
		expect(ordersValues).toHaveLength(7);
	});

	it("should pass a 7-element array of AOV values to the third buildSparklinePath call", async () => {
		await fetchKpiSparklines();

		const [aovValues] = mockBuildSparklinePath.mock.calls[2] as [number[]];
		expect(aovValues).toHaveLength(7);
	});

	it("should fill missing days with 0 for revenue and orders arrays", async () => {
		// Return only 1 row (day 2026-02-08), the other 6 days should be 0
		mockPrismaQueryRaw.mockResolvedValue([
			{ date: "2026-02-08", revenue: BigInt(5000), orders: BigInt(3) },
		]);

		await fetchKpiSparklines();

		const [revenueValues] = mockBuildSparklinePath.mock.calls[0] as [number[]];
		const [ordersValues] = mockBuildSparklinePath.mock.calls[1] as [number[]];
		// 6 of the 7 values should be 0
		const zeroRevenueCount = revenueValues.filter((v) => v === 0).length;
		const zeroOrdersCount = ordersValues.filter((v) => v === 0).length;
		expect(zeroRevenueCount).toBe(6);
		expect(zeroOrdersCount).toBe(6);
	});

	it("should fill all 7 values with 0 when query returns no rows", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		await fetchKpiSparklines();

		const [revenueValues] = mockBuildSparklinePath.mock.calls[0] as [number[]];
		const [ordersValues] = mockBuildSparklinePath.mock.calls[1] as [number[]];
		const [aovValues] = mockBuildSparklinePath.mock.calls[2] as [number[]];
		expect(revenueValues).toEqual([0, 0, 0, 0, 0, 0, 0]);
		expect(ordersValues).toEqual([0, 0, 0, 0, 0, 0, 0]);
		expect(aovValues).toEqual([0, 0, 0, 0, 0, 0, 0]);
	});

	it("should compute AOV as revenue / orders per day, defaulting to 0 when orders is 0", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		await fetchKpiSparklines();

		const [aovValues] = mockBuildSparklinePath.mock.calls[2] as [number[]];
		// All orders are 0, so all AOV values should be 0
		expect(aovValues.every((v) => v === 0)).toBe(true);
	});

	it("should compute correct AOV when orders > 0", async () => {
		// sevenDaysAgo = 2026-02-08T12:00:00Z, loop i=0..6 → keys 2026-02-08..2026-02-14
		// One row for 2026-02-10 (i=2): revenue=6000, orders=3 → AOV=2000
		mockPrismaQueryRaw.mockResolvedValue([
			{ date: "2026-02-10", revenue: BigInt(6000), orders: BigInt(3) },
		]);

		await fetchKpiSparklines();

		const [aovValues] = mockBuildSparklinePath.mock.calls[2] as [number[]];
		const nonZeroAov = aovValues.filter((v) => v > 0);
		expect(nonZeroAov).toContain(2000);
	});

	it("should pass numeric values (not BigInt) to buildSparklinePath", async () => {
		mockPrismaQueryRaw.mockResolvedValue([
			{ date: "2026-02-10", revenue: BigInt(3000), orders: BigInt(2) },
		]);

		await fetchKpiSparklines();

		const [revenueValues] = mockBuildSparklinePath.mock.calls[0] as [number[]];
		for (const v of revenueValues) {
			expect(typeof v).toBe("number");
		}
	});

	// -------------------------------------------------------------------------
	// Date range computation
	// -------------------------------------------------------------------------

	it("should compute sevenDaysAgo as 7 days before current date", async () => {
		// Fixed time: 2026-02-15T12:00:00Z → sevenDaysAgo = 2026-02-08T12:00:00Z
		// The loop builds keys from sevenDaysAgo + 0..6 days
		// All 7 keys should be in the 2026-02-08 to 2026-02-14 range
		mockPrismaQueryRaw.mockResolvedValue([
			{ date: "2026-02-08", revenue: BigInt(1000), orders: BigInt(1) },
			{ date: "2026-02-14", revenue: BigInt(2000), orders: BigInt(2) },
		]);

		await fetchKpiSparklines();

		const [revenueValues] = mockBuildSparklinePath.mock.calls[0] as [number[]];
		// Both dates should be matched → non-zero values
		const nonZero = revenueValues.filter((v) => v > 0);
		expect(nonZero).toHaveLength(2);
		expect(nonZero[0]).toBe(1000);
		expect(nonZero[1]).toBe(2000);
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the KPIS tag", async () => {
		await fetchKpiSparklines();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-kpis");
	});

	it("should call cacheDashboard exactly once", async () => {
		await fetchKpiSparklines();

		expect(mockCacheDefault).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// Raw query is called
	// -------------------------------------------------------------------------

	it("should query the database exactly once", async () => {
		await fetchKpiSparklines();

		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// aggregateIntoBuckets
// ============================================================================

describe("aggregateIntoBuckets", () => {
	// -------------------------------------------------------------------------
	// Empty / minimal inputs
	// -------------------------------------------------------------------------

	it("should return 7 zeros for an empty array", () => {
		expect(aggregateIntoBuckets([], 7)).toEqual([0, 0, 0, 0, 0, 0, 0]);
	});

	it("should place a single value in the first bucket and pad the rest with zeros", () => {
		expect(aggregateIntoBuckets([100], 7)).toEqual([100, 0, 0, 0, 0, 0, 0]);
	});

	it("should fill leading buckets with values and pad trailing buckets with zeros for 3 values", () => {
		expect(aggregateIntoBuckets([10, 20, 30], 7)).toEqual([10, 20, 30, 0, 0, 0, 0]);
	});

	it("should fill 6 buckets with values and pad the last bucket with zero", () => {
		expect(aggregateIntoBuckets([1, 2, 3, 4, 5, 6], 7)).toEqual([1, 2, 3, 4, 5, 6, 0]);
	});

	// -------------------------------------------------------------------------
	// Exact fit
	// -------------------------------------------------------------------------

	it("should return values unchanged when count equals bucketCount", () => {
		expect(aggregateIntoBuckets([1, 2, 3, 4, 5, 6, 7], 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	// -------------------------------------------------------------------------
	// Aggregation (values > buckets)
	// -------------------------------------------------------------------------

	it("should sum pairs of values when 14 values are distributed into 7 buckets", () => {
		const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
		expect(aggregateIntoBuckets(values, 7)).toEqual([3, 7, 11, 15, 19, 23, 27]);
	});

	it("should distribute 30 values into 7 buckets using floor-based bucket boundaries", () => {
		// bucketSize = 30/7 ≈ 4.2857
		// Bucket 0: indices 0-3  → 1+2+3+4   = 10
		// Bucket 1: indices 4-7  → 5+6+7+8   = 26
		// Bucket 2: indices 8-11 → 9+10+11+12 = 42
		// Bucket 3: indices 12-16 → 13+14+15+16+17 = 75
		// Bucket 4: indices 17-20 → 18+19+20+21 = 78
		// Bucket 5: indices 21-24 → 22+23+24+25 = 94
		// Bucket 6: indices 25-29 → 26+27+28+29+30 = 140
		const values = Array.from({ length: 30 }, (_, i) => i + 1);
		expect(aggregateIntoBuckets(values, 7)).toEqual([10, 26, 42, 75, 78, 94, 140]);
	});

	// -------------------------------------------------------------------------
	// All-zero inputs
	// -------------------------------------------------------------------------

	it("should return all zeros when all input values are zero", () => {
		expect(aggregateIntoBuckets([0, 0, 0, 0, 0, 0, 0], 7)).toEqual([0, 0, 0, 0, 0, 0, 0]);
	});

	it("should return all zeros when more than bucketCount zero values are aggregated", () => {
		const values = new Array(14).fill(0) as number[];
		expect(aggregateIntoBuckets(values, 7)).toEqual([0, 0, 0, 0, 0, 0, 0]);
	});

	// -------------------------------------------------------------------------
	// Output length guarantee
	// -------------------------------------------------------------------------

	it("should always return exactly bucketCount elements for an empty array", () => {
		expect(aggregateIntoBuckets([], 7)).toHaveLength(7);
	});

	it("should always return exactly bucketCount elements when values are fewer than buckets", () => {
		expect(aggregateIntoBuckets([10, 20], 7)).toHaveLength(7);
	});

	it("should always return exactly bucketCount elements when values equal buckets", () => {
		expect(aggregateIntoBuckets([1, 2, 3, 4, 5, 6, 7], 7)).toHaveLength(7);
	});

	it("should always return exactly bucketCount elements when values exceed buckets", () => {
		const values = Array.from({ length: 30 }, (_, i) => i + 1);
		expect(aggregateIntoBuckets(values, 7)).toHaveLength(7);
	});
});
