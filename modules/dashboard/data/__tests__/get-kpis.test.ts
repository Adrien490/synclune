import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrismaOrderAggregate, mockPrismaOrderCount, mockCacheDashboard } = vi.hoisted(() => ({
	mockPrismaOrderAggregate: vi.fn(),
	mockPrismaOrderCount: vi.fn(),
	mockCacheDashboard: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			aggregate: mockPrismaOrderAggregate,
			count: mockPrismaOrderCount,
		},
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	cacheDashboard: mockCacheDashboard,
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		REFUNDED: "REFUNDED",
	},
}));

import { fetchDashboardKpis } from "../get-kpis";

// ============================================================================
// HELPERS
// ============================================================================

function makeAggregateResult(total: number | null, count = 0) {
	return { _sum: { total }, _count: count };
}

function setupDefaultMocks({
	currentRevenue = 10000,
	lastRevenue = 8000,
	currentOrderCount = 12,
	lastOrderCount = 10,
	currentAovTotal = 10000,
	currentAovCount = 4,
	lastAovTotal = 8000,
	lastAovCount = 4,
}: {
	currentRevenue?: number | null;
	lastRevenue?: number | null;
	currentOrderCount?: number;
	lastOrderCount?: number;
	currentAovTotal?: number | null;
	currentAovCount?: number;
	lastAovTotal?: number | null;
	lastAovCount?: number;
} = {}) {
	// aggregate is called 4 times: 2 for revenue, 2 for AOV
	mockPrismaOrderAggregate
		// fetchMonthlyRevenue: current month
		.mockResolvedValueOnce(makeAggregateResult(currentRevenue))
		// fetchMonthlyRevenue: last month
		.mockResolvedValueOnce(makeAggregateResult(lastRevenue))
		// fetchAverageOrderValue: current month
		.mockResolvedValueOnce(makeAggregateResult(currentAovTotal, currentAovCount))
		// fetchAverageOrderValue: last month
		.mockResolvedValueOnce(makeAggregateResult(lastAovTotal, lastAovCount));

	// count is called 2 times for fetchMonthlyOrders
	mockPrismaOrderCount
		.mockResolvedValueOnce(currentOrderCount)
		.mockResolvedValueOnce(lastOrderCount);
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardKpis", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		// Fix date to 2026-02-15T12:00:00Z for all tests
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return all 3 KPIs with expected shape", async () => {
		setupDefaultMocks();

		const result = await fetchDashboardKpis();

		expect(result).toHaveProperty("monthlyRevenue");
		expect(result).toHaveProperty("monthlyOrders");
		expect(result).toHaveProperty("averageOrderValue");
		expect(result.monthlyRevenue).toHaveProperty("amount");
		expect(result.monthlyRevenue).toHaveProperty("evolution");
		expect(result.monthlyOrders).toHaveProperty("count");
		expect(result.monthlyOrders).toHaveProperty("evolution");
		expect(result.averageOrderValue).toHaveProperty("amount");
		expect(result.averageOrderValue).toHaveProperty("evolution");
	});

	// -------------------------------------------------------------------------
	// Monthly revenue
	// -------------------------------------------------------------------------

	it("should compute positive evolution when current revenue exceeds last month", async () => {
		setupDefaultMocks({ currentRevenue: 12000, lastRevenue: 8000 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(12000);
		// ((12000 - 8000) / 8000) * 100 = 50
		expect(result.monthlyRevenue.evolution).toBeCloseTo(50);
	});

	it("should compute negative evolution when current revenue is below last month", async () => {
		setupDefaultMocks({ currentRevenue: 4000, lastRevenue: 8000 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(4000);
		// ((4000 - 8000) / 8000) * 100 = -50
		expect(result.monthlyRevenue.evolution).toBeCloseTo(-50);
	});

	it("should return evolution of 0 when last month revenue is 0", async () => {
		setupDefaultMocks({ currentRevenue: 5000, lastRevenue: 0 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(5000);
		expect(result.monthlyRevenue.evolution).toBe(0);
	});

	it("should default amounts to 0 when aggregate returns null sums", async () => {
		setupDefaultMocks({ currentRevenue: null, lastRevenue: null });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(0);
		expect(result.monthlyRevenue.evolution).toBe(0);
	});

	it("should return amount of 0 when both revenue sums are null", async () => {
		setupDefaultMocks({
			currentRevenue: null,
			lastRevenue: null,
			currentAovTotal: null,
			lastAovTotal: null,
		});

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Monthly orders
	// -------------------------------------------------------------------------

	it("should return correct order count", async () => {
		setupDefaultMocks({ currentOrderCount: 15, lastOrderCount: 10 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyOrders.count).toBe(15);
	});

	it("should compute positive order evolution", async () => {
		setupDefaultMocks({ currentOrderCount: 15, lastOrderCount: 10 });

		const result = await fetchDashboardKpis();

		// ((15 - 10) / 10) * 100 = 50
		expect(result.monthlyOrders.evolution).toBeCloseTo(50);
	});

	it("should compute negative order evolution when fewer orders this month", async () => {
		setupDefaultMocks({ currentOrderCount: 5, lastOrderCount: 10 });

		const result = await fetchDashboardKpis();

		// ((5 - 10) / 10) * 100 = -50
		expect(result.monthlyOrders.evolution).toBeCloseTo(-50);
	});

	it("should return order evolution of 0 when last month had no orders", async () => {
		setupDefaultMocks({ currentOrderCount: 8, lastOrderCount: 0 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyOrders.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Average order value
	// -------------------------------------------------------------------------

	it("should compute average order value as sum divided by count", async () => {
		// Current: 9000 / 3 = 3000, Last: 8000 / 4 = 2000
		setupDefaultMocks({
			currentAovTotal: 9000,
			currentAovCount: 3,
			lastAovTotal: 8000,
			lastAovCount: 4,
		});

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.amount).toBe(3000);
		// ((3000 - 2000) / 2000) * 100 = 50
		expect(result.averageOrderValue.evolution).toBeCloseTo(50);
	});

	it("should return amount of 0 when current month count is 0", async () => {
		setupDefaultMocks({
			currentAovTotal: 0,
			currentAovCount: 0,
			lastAovTotal: 8000,
			lastAovCount: 4,
		});

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.amount).toBe(0);
	});

	it("should return AOV evolution of 0 when last month count is 0", async () => {
		setupDefaultMocks({
			currentAovTotal: 6000,
			currentAovCount: 2,
			lastAovTotal: 0,
			lastAovCount: 0,
		});

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.evolution).toBe(0);
	});

	it("should handle null AOV sums by defaulting to 0", async () => {
		setupDefaultMocks({
			currentAovTotal: null,
			currentAovCount: 3,
			lastAovTotal: null,
			lastAovCount: 2,
		});

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.amount).toBe(0);
		expect(result.averageOrderValue.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Prisma query filters
	// -------------------------------------------------------------------------

	it("should query with PaymentStatus.PAID filter for all aggregates", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		// All aggregate calls must include paymentStatus: "PAID"
		const aggregateCalls = mockPrismaOrderAggregate.mock.calls;
		for (const [args] of aggregateCalls) {
			expect(args.where.paymentStatus).toBe("PAID");
		}
	});

	it("should query with notDeleted filter (deletedAt: null) for all calls", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const aggregateCalls = mockPrismaOrderAggregate.mock.calls;
		for (const [args] of aggregateCalls) {
			expect(args.where.deletedAt).toBeNull();
		}

		const countCalls = mockPrismaOrderCount.mock.calls;
		for (const [args] of countCalls) {
			expect(args.where.deletedAt).toBeNull();
		}
	});

	it("should scope current month queries from the first day of current UTC month", async () => {
		// Fixed time: 2026-02-15T12:00:00Z → current month start = 2026-02-01T00:00:00Z
		setupDefaultMocks();

		await fetchDashboardKpis();

		const firstAggregatCall = mockPrismaOrderAggregate.mock.calls[0]![0];
		const expectedCurrentMonthStart = new Date(Date.UTC(2026, 1, 1)); // Feb 1 2026
		expect(firstAggregatCall.where.paidAt.gte).toEqual(expectedCurrentMonthStart);
	});

	it("should scope last month queries with correct gte and lte bounds", async () => {
		// Fixed time: 2026-02-15 → last month start = 2026-01-01, end = 2026-01-31T23:59:59
		setupDefaultMocks();

		await fetchDashboardKpis();

		const lastMonthAggregate = mockPrismaOrderAggregate.mock.calls[1]![0];
		const expectedLastMonthStart = new Date(Date.UTC(2026, 0, 1)); // Jan 1 2026
		const expectedLastMonthEnd = new Date(Date.UTC(2026, 1, 0, 23, 59, 59)); // Jan 31 2026
		expect(lastMonthAggregate.where.paidAt.gte).toEqual(expectedLastMonthStart);
		expect(lastMonthAggregate.where.paidAt.lte).toEqual(expectedLastMonthEnd);
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the KPIS tag", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		expect(mockCacheDashboard).toHaveBeenCalledWith("dashboard-kpis");
	});
});
