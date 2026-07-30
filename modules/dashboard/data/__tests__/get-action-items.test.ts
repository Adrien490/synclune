import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOrderCount } = vi.hoisted(() => ({
	mockOrderCount: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: { count: mockOrderCount },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	OrderStatus: { PROCESSING: "PROCESSING", SHIPPED: "SHIPPED" },
	PaymentStatus: { PAID: "PAID", PENDING: "PENDING" },
}));

import { fetchDashboardActionItems } from "../get-action-items";

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardActionItems", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockOrderCount.mockResolvedValue(0);
	});

	it("returns zero counts when nothing is pending", async () => {
		const result = await fetchDashboardActionItems();

		expect(result).toEqual({
			overbilledOrders: 0,
			stuckProcessing: 0,
			stuckShipped: 0,
			stuckInvoices: 0,
			orphanPending: 0,
		});
	});

	it("maps each count to the right field (Promise.all order)", async () => {
		// order.count call order: overbilled, stuckProcessing, stuckShipped, stuckInvoices, orphanPending
		mockOrderCount
			.mockResolvedValueOnce(1)
			.mockResolvedValueOnce(2)
			.mockResolvedValueOnce(3)
			.mockResolvedValueOnce(4)
			.mockResolvedValueOnce(5);

		const result = await fetchDashboardActionItems();

		expect(result).toEqual({
			overbilledOrders: 1,
			stuckProcessing: 2,
			stuckShipped: 3,
			stuckInvoices: 4,
			orphanPending: 5,
		});
		expect(mockOrderCount).toHaveBeenCalledTimes(5);
	});

	it("scopes the overbilled query to unresolved, non-deleted orders", async () => {
		await fetchDashboardActionItems();

		const where = mockOrderCount.mock.calls[0]![0].where;
		expect(where.overbilledAmountCents).toEqual({ not: null });
		expect(where.overbillingResolvedAt).toBeNull();
		expect(where.deletedAt).toBeNull();
	});
});
