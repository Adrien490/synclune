import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOrderGroupBy, mockOrderCount, mockCacheDefault } = vi.hoisted(() => ({
	mockOrderGroupBy: vi.fn(),
	mockOrderCount: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			groupBy: mockOrderGroupBy,
			count: mockOrderCount,
		},
	},
	notDeleted: { deletedAt: null },
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
		FULFILLMENT: "dashboard-fulfillment",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	},
	PaymentStatus: {
		PAID: "PAID",
	},
}));

import { fetchFulfillmentPipeline } from "../get-fulfillment-pipeline";

// ============================================================================
// HELPERS
// ============================================================================

function makeGroupByRow(fulfillmentStatus: string, count: number) {
	return { fulfillmentStatus, _count: count };
}

function setupDefaultMocks({
	statusRows = [] as { fulfillmentStatus: string; _count: number }[],
	lateShipments = 0,
} = {}) {
	mockOrderGroupBy.mockResolvedValue(statusRows);
	mockOrderCount.mockResolvedValue(lateShipments);
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchFulfillmentPipeline", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
		setupDefaultMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with all pipeline fields", async () => {
		const result = await fetchFulfillmentPipeline();

		expect(result).toHaveProperty("unfulfilled");
		expect(result).toHaveProperty("processing");
		expect(result).toHaveProperty("shipped");
		expect(result).toHaveProperty("delivered");
		expect(result).toHaveProperty("returned");
		expect(result).toHaveProperty("lateShipments");
	});

	it("should return zeros for all statuses when no orders exist", async () => {
		const result = await fetchFulfillmentPipeline();

		expect(result).toEqual({
			unfulfilled: 0,
			processing: 0,
			shipped: 0,
			delivered: 0,
			returned: 0,
			lateShipments: 0,
		});
	});

	// -------------------------------------------------------------------------
	// Status count mapping
	// -------------------------------------------------------------------------

	it("should map groupBy results to the correct pipeline fields", async () => {
		setupDefaultMocks({
			statusRows: [
				makeGroupByRow("UNFULFILLED", 4),
				makeGroupByRow("PROCESSING", 2),
				makeGroupByRow("SHIPPED", 7),
				makeGroupByRow("DELIVERED", 15),
				makeGroupByRow("RETURNED", 1),
			],
			lateShipments: 3,
		});

		const result = await fetchFulfillmentPipeline();

		expect(result.unfulfilled).toBe(4);
		expect(result.processing).toBe(2);
		expect(result.shipped).toBe(7);
		expect(result.delivered).toBe(15);
		expect(result.returned).toBe(1);
		expect(result.lateShipments).toBe(3);
	});

	it("should default missing statuses to 0 when groupBy result has no row for them", async () => {
		setupDefaultMocks({
			statusRows: [makeGroupByRow("SHIPPED", 5)],
		});

		const result = await fetchFulfillmentPipeline();

		expect(result.unfulfilled).toBe(0);
		expect(result.processing).toBe(0);
		expect(result.shipped).toBe(5);
		expect(result.delivered).toBe(0);
		expect(result.returned).toBe(0);
	});

	it("should return the late shipments count from the order.count query", async () => {
		setupDefaultMocks({ lateShipments: 8 });

		const result = await fetchFulfillmentPipeline();

		expect(result.lateShipments).toBe(8);
	});

	// -------------------------------------------------------------------------
	// Prisma query filters
	// -------------------------------------------------------------------------

	it("should group orders by fulfillmentStatus with PAID paymentStatus and notDeleted", async () => {
		await fetchFulfillmentPipeline();

		const [groupByArgs] = mockOrderGroupBy.mock.calls[0] as [
			{ by: string[]; where: Record<string, unknown> },
		];
		expect(groupByArgs.by).toEqual(["fulfillmentStatus"]);
		expect(groupByArgs.where.paymentStatus).toBe("PAID");
		expect(groupByArgs.where.deletedAt).toBeNull();
		expect(groupByArgs._count).toBe(true);
	});

	it("should query late shipments with UNFULFILLED and PROCESSING fulfillment statuses", async () => {
		await fetchFulfillmentPipeline();

		const [countArgs] = mockOrderCount.mock.calls[0] as [{ where: Record<string, unknown> }];
		expect(countArgs.where.fulfillmentStatus).toEqual({
			in: ["UNFULFILLED", "PROCESSING"],
		});
	});

	it("should query late shipments with PAID paymentStatus", async () => {
		await fetchFulfillmentPipeline();

		const [countArgs] = mockOrderCount.mock.calls[0] as [{ where: Record<string, unknown> }];
		expect(countArgs.where.paymentStatus).toBe("PAID");
	});

	it("should query late shipments with notDeleted filter", async () => {
		await fetchFulfillmentPipeline();

		const [countArgs] = mockOrderCount.mock.calls[0] as [{ where: Record<string, unknown> }];
		expect(countArgs.where.deletedAt).toBeNull();
	});

	it("should compute the late cutoff as 5 days before now", async () => {
		// Fixed time: 2026-02-15T12:00:00Z → cutoff = 2026-02-10T12:00:00Z
		await fetchFulfillmentPipeline();

		const [countArgs] = mockOrderCount.mock.calls[0] as [{ where: { paidAt: { lt: Date } } }];
		const cutoff = countArgs.where.paidAt.lt;
		expect(cutoff).toBeInstanceOf(Date);
		// Cutoff should be exactly 5 days before the mocked system time
		const expectedCutoff = new Date("2026-02-10T12:00:00Z");
		expect(cutoff.toISOString()).toBe(expectedCutoff.toISOString());
	});

	it("should run groupBy and count queries in parallel", async () => {
		await fetchFulfillmentPipeline();

		expect(mockOrderGroupBy).toHaveBeenCalledTimes(1);
		expect(mockOrderCount).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the FULFILLMENT tag", async () => {
		await fetchFulfillmentPipeline();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-fulfillment");
	});

	it("should call cacheDashboard exactly once", async () => {
		await fetchFulfillmentPipeline();

		expect(mockCacheDefault).toHaveBeenCalledTimes(1);
	});
});
