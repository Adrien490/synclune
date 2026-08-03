import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrismaOrderAggregate,
	mockPrismaOrderCount,
	mockPrismaRefundAggregate,
	mockPrismaQueryRaw,
	mockCacheDefault,
} = vi.hoisted(() => ({
	mockPrismaOrderAggregate: vi.fn(),
	mockPrismaOrderCount: vi.fn(),
	mockPrismaRefundAggregate: vi.fn(),
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
		$queryRaw: mockPrismaQueryRaw,
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
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
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	},
	RefundStatus: {
		COMPLETED: "COMPLETED",
	},
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
	},
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
	},
}));

import { fetchDashboardKpis } from "../get-kpis";

/**
 * Lot 4 SIMPLIFICATION.md S3.5 (2026-08-03) : le fetcher ne sert plus que le
 * MOIS EN COURS — plus de comparaison « vs période précédente », de sparklines
 * ni de délai moyen d'expédition. Les 13 requêtes historiques tombent à 6.
 */
describe("fetchDashboardKpis — mois en cours uniquement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// currentMonth aggregate
		mockPrismaOrderAggregate.mockResolvedValue({
			_sum: { total: 10000, discountAmount: 500 },
			_count: 4,
		});
		// currentTotalOrders, currentPaidCreated, pendingShipment
		mockPrismaOrderCount.mockResolvedValueOnce(8).mockResolvedValueOnce(4).mockResolvedValueOnce(2);
		mockPrismaRefundAggregate.mockResolvedValue({ _sum: { amount: 1000 }, _count: 1 });
		mockPrismaQueryRaw.mockResolvedValue([{ currentCount: 3n }]);
	});

	it("returns all expected KPI groups (raw month values, no evolutions)", async () => {
		const result = await fetchDashboardKpis();

		expect(result).toEqual({
			monthlyRevenue: {
				amount: 10000,
				netAmount: 9000,
				refundAmount: 1000,
				refundCount: 1,
				refundRate: 25,
			},
			monthlyOrders: { count: 4 },
			averageOrderValue: { amount: 2500 },
			conversionRate: { rate: 50, abandoned: 4 },
			pendingShipment: { count: 2 },
			discountImpact: { amount: 500 },
			newCustomers: { count: 3 },
		});
	});

	it("issues exactly 1 aggregate, 3 counts, 1 refund aggregate and 1 raw query", async () => {
		await fetchDashboardKpis();

		expect(mockPrismaOrderAggregate).toHaveBeenCalledTimes(1);
		expect(mockPrismaOrderCount).toHaveBeenCalledTimes(3);
		expect(mockPrismaRefundAggregate).toHaveBeenCalledTimes(1);
		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1);
	});

	it("computes net revenue after refunds (ANALYTICS-AUDIT-001)", async () => {
		mockPrismaOrderAggregate.mockResolvedValue({
			_sum: { total: 20000, discountAmount: 0 },
			_count: 10,
		});
		mockPrismaRefundAggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 2 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.netAmount).toBe(15000);
		expect(result.monthlyRevenue.refundRate).toBe(20);
	});

	it("returns zeros gracefully when the month is empty", async () => {
		mockPrismaOrderAggregate.mockResolvedValue({
			_sum: { total: null, discountAmount: null },
			_count: 0,
		});
		mockPrismaOrderCount.mockReset();
		mockPrismaOrderCount.mockResolvedValue(0);
		mockPrismaRefundAggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });
		mockPrismaQueryRaw.mockResolvedValue([{ currentCount: 0n }]);

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.netAmount).toBe(0);
		expect(result.averageOrderValue.amount).toBe(0);
		expect(result.conversionRate.rate).toBe(0);
		expect(result.newCustomers.count).toBe(0);
	});

	it("tags the cache with the KPIS dashboard tag", async () => {
		await fetchDashboardKpis();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-kpis");
	});
});
