import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOrderAggregate } = vi.hoisted(() => ({
	mockOrderAggregate: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { aggregate: mockOrderAggregate } },
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: vi.fn(),
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: { EU_OSS_PROGRESS: "dashboard-eu-oss-progress" },
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: { LIST: "orders-list" },
}));

vi.mock("@/modules/orders/constants/revenue-status.constants", () => ({
	PAID_REVENUE_STATUSES: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"],
}));

import { fetchDashboardEuOssProgress } from "../get-eu-oss-progress";
import { EU_OSS_DISTANCE_SALES_THRESHOLD_CENTS } from "@/shared/constants/vat-franchise";

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardEuOssProgress", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOrderAggregate.mockResolvedValue({ _sum: { total: 0 } });
	});

	it("returns 0 progress when no intra-EU sales", async () => {
		const result = await fetchDashboardEuOssProgress();

		expect(result.ytdEuSales).toBe(0);
		expect(result.threshold).toBe(EU_OSS_DISTANCE_SALES_THRESHOLD_CENTS);
		expect(result.progress).toBe(0);
		expect(result.year).toBeGreaterThanOrEqual(2026);
	});

	it("computes progress against the 10 000 € OSS threshold", async () => {
		// 2 500 € → 25 % of the 10 000 € threshold.
		mockOrderAggregate.mockResolvedValue({ _sum: { total: 250_000 } });

		const result = await fetchDashboardEuOssProgress();

		expect(result.ytdEuSales).toBe(250_000);
		expect(result.threshold).toBe(1_000_000);
		expect(result.progress).toBeCloseTo(25);
	});

	it("excludes FR and MC from the intra-EU distance-sales count", async () => {
		await fetchDashboardEuOssProgress();

		const where = mockOrderAggregate.mock.calls[0]![0].where;
		expect(where.shippingCountry).toEqual({ notIn: ["FR", "MC"] });
		expect(where.paymentStatus).toEqual({ in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] });
		expect(where.paidAt.gte).toBeInstanceOf(Date);
		expect(where.deletedAt).toBeNull();
	});

	it("handles a null aggregate sum (no rows) as 0", async () => {
		mockOrderAggregate.mockResolvedValue({ _sum: { total: null } });

		const result = await fetchDashboardEuOssProgress();

		expect(result.ytdEuSales).toBe(0);
	});
});
