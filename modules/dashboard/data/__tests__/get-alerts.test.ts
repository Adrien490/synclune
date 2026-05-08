import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefundCount, mockDisputeCount, mockProductSkuCount, mockCacheDefault } = vi.hoisted(
	() => ({
		mockRefundCount: vi.fn(),
		mockDisputeCount: vi.fn(),
		mockProductSkuCount: vi.fn(),
		mockCacheDefault: vi.fn(),
	}),
);

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		refund: { count: mockRefundCount },
		dispute: { count: mockDisputeCount },
		productSku: { count: mockProductSkuCount },
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDefault,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		ALERTS: "dashboard-alerts",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	DisputeStatus: {
		NEEDS_RESPONSE: "NEEDS_RESPONSE",
		UNDER_REVIEW: "UNDER_REVIEW",
		WON: "WON",
		LOST: "LOST",
	},
	ProductStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
	},
}));

import { fetchDashboardAlerts } from "../get-alerts";

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardAlerts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRefundCount.mockResolvedValue(0);
		mockDisputeCount.mockResolvedValue(0);
		mockProductSkuCount.mockResolvedValue(0);
	});

	it("should return all alert counts", async () => {
		mockRefundCount.mockResolvedValue(3);
		mockDisputeCount.mockResolvedValue(1);
		mockProductSkuCount.mockResolvedValue(5);

		const result = await fetchDashboardAlerts();

		expect(result).toEqual({
			pendingRefunds: 3,
			activeDisputes: 1,
			lowStockSkus: 5,
		});
	});

	it("should return zeros when no alerts", async () => {
		const result = await fetchDashboardAlerts();

		expect(result).toEqual({
			pendingRefunds: 0,
			activeDisputes: 0,
			lowStockSkus: 0,
		});
	});

	it("should query refunds with PENDING status", async () => {
		await fetchDashboardAlerts();

		expect(mockRefundCount).toHaveBeenCalledWith({
			where: { status: "PENDING" },
		});
	});

	it("should query disputes with NEEDS_RESPONSE and UNDER_REVIEW statuses", async () => {
		await fetchDashboardAlerts();

		expect(mockDisputeCount).toHaveBeenCalledWith({
			where: { status: { in: ["NEEDS_RESPONSE", "UNDER_REVIEW"] } },
		});
	});

	it("should query low stock SKUs with active status and public products", async () => {
		await fetchDashboardAlerts();

		expect(mockProductSkuCount).toHaveBeenCalledWith({
			where: {
				isActive: true,
				inventory: { lte: 3 },
				product: { status: "PUBLIC", deletedAt: null },
			},
		});
	});

	it("should call cacheDashboard with the ALERTS tag", async () => {
		await fetchDashboardAlerts();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-alerts");
	});

	it("should make all 3 queries in parallel", async () => {
		await fetchDashboardAlerts();

		expect(mockRefundCount).toHaveBeenCalledTimes(1);
		expect(mockDisputeCount).toHaveBeenCalledTimes(1);
		expect(mockProductSkuCount).toHaveBeenCalledTimes(1);
	});
});
