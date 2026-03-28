import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrismaOrderAggregate,
	mockPrismaOrderCount,
	mockPrismaRefundAggregate,
	mockPrismaReviewStatsAggregate,
	mockPrismaNewsletterCount,
	mockPrismaQueryRaw,
	mockCacheDefault,
} = vi.hoisted(() => ({
	mockPrismaOrderAggregate: vi.fn(),
	mockPrismaOrderCount: vi.fn(),
	mockPrismaRefundAggregate: vi.fn(),
	mockPrismaReviewStatsAggregate: vi.fn(),
	mockPrismaNewsletterCount: vi.fn(),
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			aggregate: mockPrismaOrderAggregate,
			count: mockPrismaOrderCount,
		},
		refund: {
			aggregate: mockPrismaRefundAggregate,
		},
		productReviewStats: {
			aggregate: mockPrismaReviewStatsAggregate,
		},
		newsletterSubscriber: {
			count: mockPrismaNewsletterCount,
		},
		$queryRaw: mockPrismaQueryRaw,
	},
	notDeleted: { deletedAt: null },
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

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		REFUNDED: "REFUNDED",
	},
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	},
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	NewsletterStatus: {
		PENDING: "PENDING",
		CONFIRMED: "CONFIRMED",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}));

import { fetchDashboardKpis } from "../get-kpis";

// ============================================================================
// HELPERS
// ============================================================================

function makeAggregateResult(total: number | null, count = 0, discountAmount: number | null = 0) {
	return { _sum: { total, discountAmount }, _count: count };
}

function makeRefundAggregateResult(amount: number | null, count = 0) {
	return { _sum: { amount }, _count: count };
}

/**
 * Sets up all mocks in the order they are called by Promise.all:
 * 1. order.aggregate (current month - revenue)
 * 2. order.aggregate (last month - revenue)
 * 3. order.count (current month - total orders for conversion)
 * 4. order.count (last month - total orders for conversion)
 * 5. order.count (pending shipment)
 * 6. refund.aggregate (current month)
 * 7. refund.aggregate (last month)
 * 8. productReviewStats.aggregate
 * 9. newsletterSubscriber.count (total active)
 * 10. newsletterSubscriber.count (current month)
 * 11. newsletterSubscriber.count (last month)
 * 12. $queryRaw (current month fulfillment time)
 * 13. $queryRaw (last month fulfillment time)
 */
function setupDefaultMocks({
	currentTotal = 10000,
	currentCount = 4,
	currentDiscount = 200,
	lastTotal = 8000,
	lastCount = 4,
	lastDiscount = 100,
	currentTotalOrders = 6,
	lastTotalOrders = 5,
	pendingShipment = 2,
	currentRefundAmount = 500,
	currentRefundCount = 1,
	lastRefundAmount = 300,
	lastRefundCount = 1,
}: {
	currentTotal?: number | null;
	currentCount?: number;
	currentDiscount?: number | null;
	lastTotal?: number | null;
	lastCount?: number;
	lastDiscount?: number | null;
	currentTotalOrders?: number;
	lastTotalOrders?: number;
	pendingShipment?: number;
	currentRefundAmount?: number | null;
	currentRefundCount?: number;
	lastRefundAmount?: number | null;
	lastRefundCount?: number;
} = {}) {
	mockPrismaOrderAggregate
		.mockResolvedValueOnce(makeAggregateResult(currentTotal, currentCount, currentDiscount))
		.mockResolvedValueOnce(makeAggregateResult(lastTotal, lastCount, lastDiscount));

	mockPrismaOrderCount
		.mockResolvedValueOnce(currentTotalOrders)
		.mockResolvedValueOnce(lastTotalOrders)
		.mockResolvedValueOnce(pendingShipment);

	mockPrismaRefundAggregate
		.mockResolvedValueOnce(makeRefundAggregateResult(currentRefundAmount, currentRefundCount))
		.mockResolvedValueOnce(makeRefundAggregateResult(lastRefundAmount, lastRefundCount));
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardKpis", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
		// Default mocks for review stats, newsletter, and fulfillment time (always needed)
		mockPrismaReviewStatsAggregate.mockResolvedValue({
			_avg: { averageRating: null },
			_sum: { totalCount: 0 },
		});
		mockPrismaNewsletterCount.mockResolvedValue(0);
		mockPrismaQueryRaw.mockResolvedValue([{ avg_hours: null }]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return all KPIs with expected shape", async () => {
		setupDefaultMocks();

		const result = await fetchDashboardKpis();

		expect(result).toHaveProperty("monthlyRevenue");
		expect(result).toHaveProperty("monthlyOrders");
		expect(result).toHaveProperty("averageOrderValue");
		expect(result).toHaveProperty("conversionRate");
		expect(result).toHaveProperty("pendingShipment");
		expect(result).toHaveProperty("discountImpact");
		expect(result.monthlyRevenue).toHaveProperty("amount");
		expect(result.monthlyRevenue).toHaveProperty("netAmount");
		expect(result.monthlyRevenue).toHaveProperty("refundAmount");
		expect(result.monthlyRevenue).toHaveProperty("refundCount");
		expect(result.monthlyRevenue).toHaveProperty("evolution");
		expect(result.conversionRate).toHaveProperty("rate");
		expect(result.conversionRate).toHaveProperty("abandoned");
		expect(result.pendingShipment).toHaveProperty("count");
		expect(result.discountImpact).toHaveProperty("amount");
	});

	// -------------------------------------------------------------------------
	// Query count
	// -------------------------------------------------------------------------

	it("should make 2 aggregate, 3 count, and 2 refund aggregate queries", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		expect(mockPrismaOrderAggregate).toHaveBeenCalledTimes(2);
		expect(mockPrismaOrderCount).toHaveBeenCalledTimes(3);
		expect(mockPrismaRefundAggregate).toHaveBeenCalledTimes(2);
	});

	// -------------------------------------------------------------------------
	// Monthly revenue (net)
	// -------------------------------------------------------------------------

	it("should compute net revenue (gross - refunds)", async () => {
		setupDefaultMocks({
			currentTotal: 12000,
			currentCount: 4,
			currentRefundAmount: 2000,
			currentRefundCount: 2,
		});

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(12000);
		expect(result.monthlyRevenue.netAmount).toBe(10000); // 12000 - 2000
		expect(result.monthlyRevenue.refundAmount).toBe(2000);
		expect(result.monthlyRevenue.refundCount).toBe(2);
	});

	it("should compute evolution based on net revenue", async () => {
		setupDefaultMocks({
			currentTotal: 12000,
			currentCount: 4,
			currentRefundAmount: 2000,
			lastTotal: 8000,
			lastCount: 4,
			lastRefundAmount: 1000,
		});

		const result = await fetchDashboardKpis();

		// Current net = 10000, last net = 7000
		// ((10000 - 7000) / 7000) * 100 ≈ 42.86
		expect(result.monthlyRevenue.evolution).toBeCloseTo(42.86, 1);
	});

	it("should compute negative evolution when current revenue is below last month", async () => {
		setupDefaultMocks({
			currentTotal: 4000,
			currentCount: 2,
			currentRefundAmount: 0,
			lastTotal: 8000,
			lastCount: 4,
			lastRefundAmount: 0,
		});

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.evolution).toBeCloseTo(-50);
	});

	it("should return evolution of 0 when last month net revenue is 0", async () => {
		setupDefaultMocks({
			currentTotal: 5000,
			currentCount: 2,
			lastTotal: 0,
			lastCount: 0,
			lastRefundAmount: 0,
			currentRefundAmount: 0,
		});

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.evolution).toBe(0);
	});

	it("should default amounts to 0 when aggregate returns null sums", async () => {
		setupDefaultMocks({
			currentTotal: null,
			currentCount: 0,
			lastTotal: null,
			lastCount: 0,
			currentRefundAmount: null,
			lastRefundAmount: null,
		});

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(0);
		expect(result.monthlyRevenue.netAmount).toBe(0);
		expect(result.monthlyRevenue.refundAmount).toBe(0);
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

		expect(result.monthlyOrders.evolution).toBeCloseTo(50);
	});

	it("should compute negative order evolution when fewer orders this month", async () => {
		setupDefaultMocks({ currentTotal: 5000, currentCount: 5, lastTotal: 10000, lastCount: 10 });

		const result = await fetchDashboardKpis();

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
		setupDefaultMocks({
			currentTotal: 9000,
			currentCount: 3,
			lastTotal: 8000,
			lastCount: 4,
			currentRefundAmount: 0,
			lastRefundAmount: 0,
		});

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.amount).toBe(3000);
		expect(result.averageOrderValue.evolution).toBeCloseTo(50);
	});

	it("should return AOV of 0 when current month count is 0", async () => {
		setupDefaultMocks({ currentTotal: 0, currentCount: 0, lastTotal: 8000, lastCount: 4 });

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.amount).toBe(0);
	});

	it("should return AOV evolution of 0 when last month count is 0", async () => {
		setupDefaultMocks({ currentTotal: 6000, currentCount: 2, lastTotal: 0, lastCount: 0 });

		const result = await fetchDashboardKpis();

		expect(result.averageOrderValue.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Conversion rate
	// -------------------------------------------------------------------------

	it("should compute conversion rate as paid/total orders percentage", async () => {
		setupDefaultMocks({
			currentCount: 6,
			currentTotalOrders: 10,
			lastCount: 4,
			lastTotalOrders: 8,
		});

		const result = await fetchDashboardKpis();

		expect(result.conversionRate.rate).toBeCloseTo(60); // 6/10 * 100
		expect(result.conversionRate.abandoned).toBe(4); // 10 - 6
	});

	it("should compute conversion evolution vs last month", async () => {
		setupDefaultMocks({
			currentCount: 8,
			currentTotalOrders: 10,
			lastCount: 5,
			lastTotalOrders: 10,
		});

		const result = await fetchDashboardKpis();

		// Current: 80%, Last: 50%
		// ((80 - 50) / 50) * 100 = 60
		expect(result.conversionRate.evolution).toBeCloseTo(60);
	});

	it("should return conversion rate of 0 when no orders this month", async () => {
		setupDefaultMocks({ currentCount: 0, currentTotalOrders: 0 });

		const result = await fetchDashboardKpis();

		expect(result.conversionRate.rate).toBe(0);
		expect(result.conversionRate.abandoned).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Pending shipment
	// -------------------------------------------------------------------------

	it("should return pending shipment count", async () => {
		setupDefaultMocks({ pendingShipment: 7 });

		const result = await fetchDashboardKpis();

		expect(result.pendingShipment.count).toBe(7);
	});

	it("should query pending shipment with UNFULFILLED and PROCESSING statuses", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		// Third order.count call is for pending shipment
		const pendingCall = mockPrismaOrderCount.mock.calls[2]![0];
		expect(pendingCall.where.fulfillmentStatus).toEqual({
			in: ["UNFULFILLED", "PROCESSING"],
		});
		expect(pendingCall.where.paymentStatus).toBe("PAID");
	});

	// -------------------------------------------------------------------------
	// Discount impact
	// -------------------------------------------------------------------------

	it("should return discount impact amount", async () => {
		setupDefaultMocks({ currentDiscount: 500, lastDiscount: 300 });

		const result = await fetchDashboardKpis();

		expect(result.discountImpact.amount).toBe(500);
		// ((500 - 300) / 300) * 100 ≈ 66.67
		expect(result.discountImpact.evolution).toBeCloseTo(66.67, 0);
	});

	it("should default discount to 0 when null", async () => {
		setupDefaultMocks({ currentDiscount: null, lastDiscount: null });

		const result = await fetchDashboardKpis();

		expect(result.discountImpact.amount).toBe(0);
		expect(result.discountImpact.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Prisma query filters
	// -------------------------------------------------------------------------

	it("should query with PaymentStatus.PAID filter for revenue aggregates", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const aggregateCalls = mockPrismaOrderAggregate.mock.calls;
		for (const [args] of aggregateCalls) {
			expect(args.where.paymentStatus).toBe("PAID");
		}
	});

	it("should query with notDeleted filter for all order calls", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const aggregateCalls = mockPrismaOrderAggregate.mock.calls;
		for (const [args] of aggregateCalls) {
			expect(args.where.deletedAt).toBeNull();
		}
	});

	it("should request _sum with total and discountAmount in aggregate calls", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const aggregateCalls = mockPrismaOrderAggregate.mock.calls;
		for (const [args] of aggregateCalls) {
			expect(args._sum).toEqual({ total: true, discountAmount: true });
			expect(args._count).toBe(true);
		}
	});

	it("should scope current month queries from the first day of current UTC month", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const firstCall = mockPrismaOrderAggregate.mock.calls[0]![0];
		const expectedCurrentMonthStart = new Date(Date.UTC(2026, 1, 1));
		expect(firstCall.where.paidAt.gte).toEqual(expectedCurrentMonthStart);
	});

	it("should scope last month queries with correct gte and lte bounds", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const lastMonthAggregate = mockPrismaOrderAggregate.mock.calls[1]![0];
		const expectedLastMonthStart = new Date(Date.UTC(2026, 0, 1));
		const expectedLastMonthEnd = new Date(Date.UTC(2026, 1, 0, 23, 59, 59, 999));
		expect(lastMonthAggregate.where.paidAt.gte).toEqual(expectedLastMonthStart);
		expect(lastMonthAggregate.where.paidAt.lte).toEqual(expectedLastMonthEnd);
	});

	it("should query refunds with COMPLETED status", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const refundCalls = mockPrismaRefundAggregate.mock.calls;
		for (const [args] of refundCalls) {
			expect(args.where.status).toBe("COMPLETED");
		}
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the KPIS tag", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-kpis");
	});
});
