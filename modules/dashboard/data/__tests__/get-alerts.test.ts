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
		FAILED: "FAILED",
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

	it("should return the refunds-needing-attention count", async () => {
		mockRefundCount.mockResolvedValue(3);

		const result = await fetchDashboardAlerts();

		expect(result).toEqual({
			refundsNeedingAttention: 3,
		});
	});

	it("should return zero when no alerts", async () => {
		const result = await fetchDashboardAlerts();

		expect(result).toEqual({
			refundsNeedingAttention: 0,
		});
	});

	// Lot 2 S3.3 : PENDING n'a plus de producteur — l'actionnable est FAILED ou
	// COMPLETED sans avoir sur commande facturée (périmètre de reconcile-refunds).
	it("should query refunds needing attention (FAILED or missing credit note)", async () => {
		await fetchDashboardAlerts();

		expect(mockRefundCount).toHaveBeenCalledWith({
			where: {
				OR: [
					{ status: "FAILED" },
					{
						status: "COMPLETED",
						creditNoteNumber: null,
						order: { invoiceNumber: { not: null } },
					},
				],
			},
		});
	});

	it("should call cacheDashboard with the ALERTS tag", async () => {
		await fetchDashboardAlerts();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-alerts");
	});
});
