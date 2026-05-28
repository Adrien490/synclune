import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
	mockPrismaOrderAggregate,
	mockPrismaOrderCount,
	mockPrismaOrderFindMany,
	mockPrismaRefundAggregate,
	mockCacheDefault,
} = vi.hoisted(() => ({
	mockPrismaOrderAggregate: vi.fn(),
	mockPrismaOrderCount: vi.fn(),
	mockPrismaOrderFindMany: vi.fn(),
	mockPrismaRefundAggregate: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			aggregate: mockPrismaOrderAggregate,
			count: mockPrismaOrderCount,
			findMany: mockPrismaOrderFindMany,
		},
		refund: {
			aggregate: mockPrismaRefundAggregate,
		},
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
		REVENUE_CHART: "dashboard-revenue-chart",
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
		EXPIRED: "EXPIRED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
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
}));

import { fetchDashboardKpis } from "../get-kpis";
import { parisWallTimeToUtc } from "@/shared/utils/timezone";

const ENCAISSED_STATUSES = { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] };

function makeAggregateResult(total: number | null, count = 0, discountAmount: number | null = 0) {
	return { _sum: { total, discountAmount }, _count: count };
}

function makeRefundAggregateResult(amount: number | null, count = 0) {
	return { _sum: { amount }, _count: count };
}

/**
 * Sets up all mocks in the order they are called by Promise.all:
 * 1. order.aggregate (current revenue)
 * 2. order.aggregate (previous revenue)
 * 3. order.count (current totalOrders — createdAt)
 * 4. order.count (previous totalOrders — createdAt)
 * 5. order.count (current paid-created — conversion numerator)
 * 6. order.count (previous paid-created)
 * 7. order.count (pending shipment)
 * 8. refund.aggregate (current — processedAt)
 * 9. refund.aggregate (previous)
 * 10. order.findMany (current shipped)
 * 11. order.findMany (previous shipped)
 *
 * `currentPaidCreated`/`lastPaidCreated` (conversion numerator, ANALYTICS-AUDIT-006)
 * default to `currentCount`/`lastCount` to keep legacy assertions stable.
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
	currentPaidCreated,
	lastPaidCreated,
	pendingShipment = 2,
	currentRefundAmount = 500,
	currentRefundCount = 1,
	lastRefundAmount = 300,
	lastRefundCount = 1,
	currentShipped = [] as Array<{ paidAt: Date | null; shippedAt: Date | null }>,
	lastShipped = [] as Array<{ paidAt: Date | null; shippedAt: Date | null }>,
}: {
	currentTotal?: number | null;
	currentCount?: number;
	currentDiscount?: number | null;
	lastTotal?: number | null;
	lastCount?: number;
	lastDiscount?: number | null;
	currentTotalOrders?: number;
	lastTotalOrders?: number;
	currentPaidCreated?: number;
	lastPaidCreated?: number;
	pendingShipment?: number;
	currentRefundAmount?: number | null;
	currentRefundCount?: number;
	lastRefundAmount?: number | null;
	lastRefundCount?: number;
	currentShipped?: Array<{ paidAt: Date | null; shippedAt: Date | null }>;
	lastShipped?: Array<{ paidAt: Date | null; shippedAt: Date | null }>;
} = {}) {
	mockPrismaOrderAggregate
		.mockResolvedValueOnce(makeAggregateResult(currentTotal, currentCount, currentDiscount))
		.mockResolvedValueOnce(makeAggregateResult(lastTotal, lastCount, lastDiscount));

	mockPrismaOrderCount
		.mockResolvedValueOnce(currentTotalOrders)
		.mockResolvedValueOnce(lastTotalOrders)
		.mockResolvedValueOnce(currentPaidCreated ?? currentCount)
		.mockResolvedValueOnce(lastPaidCreated ?? lastCount)
		.mockResolvedValueOnce(pendingShipment);

	mockPrismaRefundAggregate
		.mockResolvedValueOnce(makeRefundAggregateResult(currentRefundAmount, currentRefundCount))
		.mockResolvedValueOnce(makeRefundAggregateResult(lastRefundAmount, lastRefundCount));

	mockPrismaOrderFindMany.mockResolvedValueOnce(currentShipped).mockResolvedValueOnce(lastShipped);
}

describe("fetchDashboardKpis", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns all expected KPI groups (no reviewHealth — split into separate fetcher)", async () => {
		setupDefaultMocks();

		const result = await fetchDashboardKpis();

		expect(result).toHaveProperty("monthlyRevenue");
		expect(result).toHaveProperty("monthlyOrders");
		expect(result).toHaveProperty("averageOrderValue");
		expect(result).toHaveProperty("conversionRate");
		expect(result).toHaveProperty("pendingShipment");
		expect(result).toHaveProperty("discountImpact");
		expect(result).toHaveProperty("avgFulfillmentTime");
		expect(result).not.toHaveProperty("reviewHealth");
	});

	it("exposes refundRate on monthlyRevenue", async () => {
		setupDefaultMocks({ currentCount: 8, currentRefundCount: 2 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.refundRate).toBeCloseTo(25);
	});

	it("returns refundRate of 0 when there are no paid orders", async () => {
		setupDefaultMocks({ currentTotal: 0, currentCount: 0, currentRefundCount: 0 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.refundRate).toBe(0);
	});

	it("exposes previousVolume on every KPI that has an evolution", async () => {
		setupDefaultMocks();

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue).toHaveProperty("previousVolume");
		expect(result.monthlyOrders).toHaveProperty("previousVolume");
		expect(result.averageOrderValue).toHaveProperty("previousVolume");
		expect(result.conversionRate).toHaveProperty("previousVolume");
		expect(result.discountImpact).toHaveProperty("previousVolume");
		expect(result.avgFulfillmentTime).toHaveProperty("previousVolume");
		expect(result.pendingShipment).not.toHaveProperty("previousVolume");
	});

	it("conversionRate.previousVolume reflects total orders (not just paid)", async () => {
		setupDefaultMocks({ currentTotalOrders: 30, lastTotalOrders: 80 });

		const result = await fetchDashboardKpis();

		expect(result.conversionRate.previousVolume).toBe(80);
	});

	it("issues 2 aggregate, 5 count, 2 refund aggregate, and 2 findMany queries", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		expect(mockPrismaOrderAggregate).toHaveBeenCalledTimes(2);
		// 5 counts: total created (×2) + paid-created conversion numerator (×2) + pending shipment
		expect(mockPrismaOrderCount).toHaveBeenCalledTimes(5);
		expect(mockPrismaRefundAggregate).toHaveBeenCalledTimes(2);
		expect(mockPrismaOrderFindMany).toHaveBeenCalledTimes(2);
	});

	it("computes net revenue (gross - refunds)", async () => {
		setupDefaultMocks({
			currentTotal: 12000,
			currentCount: 4,
			currentRefundAmount: 2000,
			currentRefundCount: 2,
		});

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.amount).toBe(12000);
		expect(result.monthlyRevenue.netAmount).toBe(10000);
		expect(result.monthlyRevenue.refundAmount).toBe(2000);
		expect(result.monthlyRevenue.refundCount).toBe(2);
	});

	it("computes evolution based on net revenue", async () => {
		setupDefaultMocks({
			currentTotal: 12000,
			currentCount: 4,
			currentRefundAmount: 2000,
			lastTotal: 8000,
			lastCount: 4,
			lastRefundAmount: 1000,
		});

		const result = await fetchDashboardKpis();

		expect(result.monthlyRevenue.evolution).toBeCloseTo(42.86, 1);
	});

	it("computes negative evolution when current revenue is below last month", async () => {
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

	it("returns evolution of 0 when last month net revenue is 0", async () => {
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

	it("defaults amounts to 0 when aggregate returns null sums", async () => {
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

	it("returns correct order count", async () => {
		setupDefaultMocks({ currentTotal: 15000, currentCount: 15, lastTotal: 10000, lastCount: 10 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyOrders.count).toBe(15);
	});

	it("computes positive order evolution", async () => {
		setupDefaultMocks({ currentTotal: 15000, currentCount: 15, lastTotal: 10000, lastCount: 10 });

		const result = await fetchDashboardKpis();

		expect(result.monthlyOrders.evolution).toBeCloseTo(50);
	});

	it("computes average order value as sum divided by count", async () => {
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

	it("computes average fulfillment time from findMany rows (no raw SQL)", async () => {
		const paid = new Date("2026-02-10T12:00:00Z");
		const shipped48h = new Date("2026-02-12T12:00:00Z");
		const shipped72h = new Date("2026-02-13T12:00:00Z");
		setupDefaultMocks({
			currentShipped: [
				{ paidAt: paid, shippedAt: shipped48h },
				{ paidAt: paid, shippedAt: shipped72h },
			],
			lastShipped: [{ paidAt: paid, shippedAt: shipped48h }],
		});

		const result = await fetchDashboardKpis();

		expect(result.avgFulfillmentTime.hours).toBeCloseTo(60);
	});

	it("returns 0 fulfillment time when no shipped orders", async () => {
		setupDefaultMocks();

		const result = await fetchDashboardKpis();

		expect(result.avgFulfillmentTime.hours).toBe(0);
	});

	it("computes conversion rate as paid/total orders percentage", async () => {
		setupDefaultMocks({
			currentCount: 6,
			currentTotalOrders: 10,
			lastCount: 4,
			lastTotalOrders: 8,
		});

		const result = await fetchDashboardKpis();

		expect(result.conversionRate.rate).toBeCloseTo(60);
		expect(result.conversionRate.abandoned).toBe(4);
	});

	it("returns conversion rate of 0 when no orders this month", async () => {
		setupDefaultMocks({ currentCount: 0, currentTotalOrders: 0 });

		const result = await fetchDashboardKpis();

		expect(result.conversionRate.rate).toBe(0);
		expect(result.conversionRate.abandoned).toBe(0);
	});

	/**
	 * @regression ANALYTICS-AUDIT-006
	 *
	 * Le taux de conversion doit utiliser le numérateur « commandes créées dans la
	 * période ET payées » (cohorte createdAt), PAS le compte de commandes payées par
	 * paidAt (qui mélange les cohortes et peut dépasser 100 %).
	 */
	it("conversion uses the paid-created cohort, not the paidAt revenue count", async () => {
		// 10 commandes payées par paidAt (revenue cohort) MAIS seulement 3 des 10 commandes
		// créées dans la période ont été payées → conversion = 3/10, pas 10/10.
		setupDefaultMocks({ currentCount: 10, currentTotalOrders: 10, currentPaidCreated: 3 });

		const result = await fetchDashboardKpis();

		expect(result.conversionRate.rate).toBeCloseTo(30);
		expect(result.conversionRate.abandoned).toBe(7);
		// Le compte de commandes (revenue) reste sur la cohorte paidAt.
		expect(result.monthlyOrders.count).toBe(10);
	});

	it("conversion numerator query filters createdAt + encaissed statuses (ANALYTICS-AUDIT-006)", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		// 3ème count (index 2) = numérateur de conversion (current paid-created).
		const paidCreatedCall = mockPrismaOrderCount.mock.calls[2]![0];
		expect(paidCreatedCall.where.createdAt).toBeDefined();
		expect(paidCreatedCall.where.paymentStatus).toEqual(ENCAISSED_STATUSES);
	});

	/**
	 * @regression ANALYTICS-AUDIT-007
	 *
	 * Les remboursements de la période courante sont bucketés sur `processedAt`
	 * (date de décaissement Stripe), cohérent avec le CA cash-basis — pas `createdAt`.
	 */
	it("buckets current-period refunds on processedAt, not createdAt", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const currentRefundCall = mockPrismaRefundAggregate.mock.calls[0]![0];
		expect(currentRefundCall.where.processedAt).toBeDefined();
		expect(currentRefundCall.where.createdAt).toBeUndefined();
		expect(currentRefundCall.where.status).toBe("COMPLETED");
	});

	it("returns pending shipment count", async () => {
		setupDefaultMocks({ pendingShipment: 7 });

		const result = await fetchDashboardKpis();

		expect(result.pendingShipment.count).toBe(7);
	});

	it("queries pending shipment with UNFULFILLED and PROCESSING statuses", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		// Pending shipment is the 5th count query (index 4) after the 2 total + 2 paid-created.
		const pendingCall = mockPrismaOrderCount.mock.calls[4]![0];
		expect(pendingCall.where.fulfillmentStatus).toEqual({
			in: ["UNFULFILLED", "PROCESSING"],
		});
		// "À expédier" : argent encore (au moins partiellement) acquis → exclut REFUNDED.
		expect(pendingCall.where.paymentStatus).toEqual({ in: ["PAID", "PARTIALLY_REFUNDED"] });
	});

	it("returns discount impact amount", async () => {
		setupDefaultMocks({ currentDiscount: 500, lastDiscount: 300 });

		const result = await fetchDashboardKpis();

		expect(result.discountImpact.amount).toBe(500);
		expect(result.discountImpact.evolution).toBeCloseTo(66.67, 0);
	});

	it("queries with encaissed statuses (PAID + refunded) for revenue aggregates", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const aggregateCalls = mockPrismaOrderAggregate.mock.calls;
		for (const [args] of aggregateCalls) {
			expect(args.where.paymentStatus).toEqual(ENCAISSED_STATUSES);
		}
	});

	it("scopes current month queries from the first day of the current Paris month", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const firstCall = mockPrismaOrderAggregate.mock.calls[0]![0];
		// 1er février 2026 00:00 Paris (= 2026-01-31T23:00:00Z en hiver, ANALYTICS-AUDIT-005).
		expect(firstCall.where.paidAt.gte).toEqual(parisWallTimeToUtc(2026, 1, 1));
	});

	it("scopes last month queries with correct gte and lte bounds (Paris)", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const lastMonthAggregate = mockPrismaOrderAggregate.mock.calls[1]![0];
		expect(lastMonthAggregate.where.paidAt.gte).toEqual(parisWallTimeToUtc(2026, 0, 1));
		expect(lastMonthAggregate.where.paidAt.lte).toEqual(
			parisWallTimeToUtc(2026, 1, 0, 23, 59, 59, 999),
		);
	});

	it("queries refunds with COMPLETED status", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		const refundCalls = mockPrismaRefundAggregate.mock.calls;
		for (const [args] of refundCalls) {
			expect(args.where.status).toBe("COMPLETED");
		}
	});

	it("calls cacheDashboard with the KPIS tag", async () => {
		setupDefaultMocks();

		await fetchDashboardKpis();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-kpis");
	});

	describe("comparisonMode parameter", () => {
		it("uses previousStart/End when mode is 'previous' (default)", async () => {
			setupDefaultMocks({ currentTotal: 10000, currentCount: 5, lastTotal: 5000, lastCount: 3 });

			await fetchDashboardKpis("month");

			const lastMonthCall = mockPrismaOrderAggregate.mock.calls[1]?.[0];
			expect(lastMonthCall).toBeDefined();
			const previousStart = lastMonthCall.where.paidAt.gte as Date;

			// Janvier 2026 00:00 Paris (mois précédent de février).
			expect(previousStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		});

		it("uses previousYearStart/End when mode is 'yoy'", async () => {
			setupDefaultMocks({ currentTotal: 10000, currentCount: 5, lastTotal: 5000, lastCount: 3 });

			await fetchDashboardKpis("month", "yoy");

			const lastYearCall = mockPrismaOrderAggregate.mock.calls[1]?.[0];
			expect(lastYearCall).toBeDefined();
			const previousStart = lastYearCall.where.paidAt.gte as Date;

			// Février 2025 00:00 Paris (même mois, année précédente).
			expect(previousStart).toEqual(parisWallTimeToUtc(2025, 1, 1));
		});

		it("computes evolution against YoY data when mode is 'yoy'", async () => {
			setupDefaultMocks({
				currentTotal: 12000,
				currentCount: 4,
				currentRefundAmount: 0,
				lastTotal: 6000,
				lastCount: 2,
				lastRefundAmount: 0,
			});

			const result = await fetchDashboardKpis("month", "yoy");

			expect(result.monthlyRevenue.evolution).toBeCloseTo(100);
		});

		it("propagates yoy boundaries to refund queries too", async () => {
			setupDefaultMocks();

			await fetchDashboardKpis("month", "yoy");

			const lastYearRefundCall = mockPrismaRefundAggregate.mock.calls[1]?.[0];
			// Refunds bucketés sur processedAt (date de décaissement, ANALYTICS-AUDIT-007).
			const refundStart = lastYearRefundCall.where.processedAt.gte as Date;

			expect(refundStart.getUTCFullYear()).toBe(2025);
		});
	});
});
