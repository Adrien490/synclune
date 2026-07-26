import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOrderCount, mockDisputeCount } = vi.hoisted(() => ({
	mockOrderCount: vi.fn(),
	mockDisputeCount: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: { count: mockOrderCount },
		dispute: { count: mockDisputeCount },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	DisputeStatus: { NEEDS_RESPONSE: "NEEDS_RESPONSE" },
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
		mockDisputeCount.mockResolvedValue(0);
	});

	it("returns zero counts when nothing is pending", async () => {
		const result = await fetchDashboardActionItems();

		expect(result).toEqual({
			disputesNearDeadline: 0,
			overbilledOrders: 0,
			stuckProcessing: 0,
			stuckShipped: 0,
			stuckInvoices: 0,
			orphanPending: 0,
		});
	});

	it("maps each count to the right field (Promise.all order)", async () => {
		mockDisputeCount.mockResolvedValue(7);
		// order.count call order: overbilled, stuckProcessing, stuckShipped, stuckInvoices, orphanPending
		mockOrderCount
			.mockResolvedValueOnce(1)
			.mockResolvedValueOnce(2)
			.mockResolvedValueOnce(3)
			.mockResolvedValueOnce(4)
			.mockResolvedValueOnce(5);

		const result = await fetchDashboardActionItems();

		expect(result).toEqual({
			disputesNearDeadline: 7,
			overbilledOrders: 1,
			stuckProcessing: 2,
			stuckShipped: 3,
			stuckInvoices: 4,
			orphanPending: 5,
		});
		expect(mockOrderCount).toHaveBeenCalledTimes(5);
		expect(mockDisputeCount).toHaveBeenCalledTimes(1);
	});

	it("queries disputes NEEDS_RESPONSE within the deadline window, excluding deleted orders", async () => {
		await fetchDashboardActionItems();

		const where = mockDisputeCount.mock.calls[0]![0].where;
		expect(where.status).toBe("NEEDS_RESPONSE");
		expect(where.dueBy.gte).toBeInstanceOf(Date);
		expect(where.dueBy.lte).toBeInstanceOf(Date);
		expect(where.order).toEqual({ deletedAt: null });
	});

	it("scopes the overbilled query to unresolved, non-deleted orders", async () => {
		await fetchDashboardActionItems();

		const where = mockOrderCount.mock.calls[0]![0].where;
		expect(where.overbilledAmountCents).toEqual({ not: null });
		expect(where.overbillingResolvedAt).toBeNull();
		expect(where.deletedAt).toBeNull();
	});
});
