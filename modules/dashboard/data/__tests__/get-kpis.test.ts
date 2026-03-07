import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrismaOrderAggregate, mockCacheDefault } = vi.hoisted(() => ({
	mockPrismaOrderAggregate: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			aggregate: mockPrismaOrderAggregate,
		},
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDefault: mockCacheDefault,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
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
	currentTotal = 10000,
	currentCount = 4,
	lastTotal = 8000,
	lastCount = 4,
}: {
	currentTotal?: number | null;
	currentCount?: number;
	lastTotal?: number | null;
	lastCount?: number;
} = {}) {
	// 2 aggregate calls: current month, last month
	mockPrismaOrderAggregate
		.mockResolvedValueOnce(makeAggregateResult(currentTotal, currentCount))
		.mockResolvedValueOnce(makeAggregateResult(lastTotal, lastCount));
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
	// Only 2 aggregate queries
	// -------------------------------------------------------------------------

	it("should make exactly 2 aggregate queries (consolidated)", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		expect(mockPrismaOrderAggregate).toHaveBeenCalledTimes(2);
	});

	// -------------------------------------------------------------------------
	// Monthly revenue
	// -------------------------------------------------------------------------

	it("should compute positive evolution when current revenue exceeds last month", async () => {
		setupDefaultMocks({ currentTotal: 12000, currentCount: 4, lastTotal: 8000, lastCount: 4 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(12000);
		// ((12000 - 8000) / 8000) * 100 = 50
		expect(result.monthlyRevenue.evolution).toBeCloseTo(50);
	});

	it("should compute negative evolution when current revenue is below last month", async () => {
		setupDefaultMocks({ currentTotal: 4000, currentCount: 2, lastTotal: 8000, lastCount: 4 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(4000);
		// ((4000 - 8000) / 8000) * 100 = -50
		expect(result.monthlyRevenue.evolution).toBeCloseTo(-50);
	});

	it("should return evolution of 0 when last month revenue is 0", async () => {
		setupDefaultMocks({ currentTotal: 5000, currentCount: 2, lastTotal: 0, lastCount: 0 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(5000);
		expect(result.monthlyRevenue.evolution).toBe(0);
	});

	it("should default amounts to 0 when aggregate returns null sums", async () => {
		setupDefaultMocks({ currentTotal: null, currentCount: 0, lastTotal: null, lastCount: 0 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(0);
		expect(result.monthlyRevenue.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Monthly orders
	// -------------------------------------------------------------------------

	it("should return correct order count", async () => {
		setupDefaultMocks({ currentTotal: 15000, currentCount: 15, lastTotal: 10000, lastCount: 10 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyOrders.count).toBe(15);
	});

	it("should compute positive order evolution", async () => {
		setupDefaultMocks({ currentTotal: 15000, currentCount: 15, lastTotal: 10000, lastCount: 10 });

		const result = await fetchDashboardKpis();

		// ((15 - 10) / 10) * 100 = 50
		expect(result.monthlyOrders.evolution).toBeCloseTo(50);
	});

	it("should compute negative order evolution when fewer orders this month", async () => {
		setupDefaultMocks({ currentTotal: 5000, currentCount: 5, lastTotal: 10000, lastCount: 10 });

		const result = await fetchDashboardKpis();

		// ((5 - 10) / 10) * 100 = -50
		expect(result.monthlyOrders.evolution).toBeCloseTo(-50);
	});

	it("should return order evolution of 0 when last month had no orders", async () => {
		setupDefaultMocks({ currentTotal: 8000, currentCount: 8, lastTotal: 0, lastCount: 0 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyOrders.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Average order value
	// -------------------------------------------------------------------------

	it("should compute average order value as sum divided by count", async () => {
		// Current: 9000 / 3 = 3000, Last: 8000 / 4 = 2000
		setupDefaultMocks({ currentTotal: 9000, currentCount: 3, lastTotal: 8000, lastCount: 4 });

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.amount).toBe(3000);
		// ((3000 - 2000) / 2000) * 100 = 50
		expect(result.averageOrderValue.evolution).toBeCloseTo(50);
	});

	it("should return amount of 0 when current month count is 0", async () => {
		setupDefaultMocks({ currentTotal: 0, currentCount: 0, lastTotal: 8000, lastCount: 4 });

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.amount).toBe(0);
	});

	it("should return AOV evolution of 0 when last month count is 0", async () => {
		setupDefaultMocks({ currentTotal: 6000, currentCount: 2, lastTotal: 0, lastCount: 0 });

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.evolution).toBe(0);
	});

	it("should handle null AOV sums by defaulting to 0", async () => {
		setupDefaultMocks({ currentTotal: null, currentCount: 3, lastTotal: null, lastCount: 2 });

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
	});

	it("should request _sum and _count in both aggregate calls", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const aggregateCalls = mockPrismaOrderAggregate.mock.calls;
		for (const [args] of aggregateCalls) {
			expect(args._sum).toEqual({ total: true });
			expect(args._count).toBe(true);
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
		const expectedLastMonthEnd = new Date(Date.UTC(2026, 1, 0, 23, 59, 59, 999)); // Jan 31 2026
		expect(lastMonthAggregate.where.paidAt.gte).toEqual(expectedLastMonthStart);
		expect(lastMonthAggregate.where.paidAt.lte).toEqual(expectedLastMonthEnd);
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDefault with the KPIS tag", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-kpis");
	});
});
