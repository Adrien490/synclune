import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefundCount, mockCacheDefault } = vi.hoisted(() => ({
	mockRefundCount: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		refund: { count: mockRefundCount },
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
	});

	it("should return pending refunds count", async () => {
		mockRefundCount.mockResolvedValue(3);

		const result = await fetchDashboardAlerts();

		expect(result).toEqual({
			pendingRefunds: 3,
		});
	});

	it("should return zero when no alerts", async () => {
		const result = await fetchDashboardAlerts();

		expect(result).toEqual({
			pendingRefunds: 0,
		});
	});

	it("should query refunds with PENDING status", async () => {
		await fetchDashboardAlerts();

		expect(mockRefundCount).toHaveBeenCalledWith({
			where: { status: "PENDING" },
		});
	});

	it("should call cacheDashboard with the ALERTS tag", async () => {
		await fetchDashboardAlerts();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-alerts");
	});
});
