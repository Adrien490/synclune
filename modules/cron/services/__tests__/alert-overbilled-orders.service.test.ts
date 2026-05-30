import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSendAdminCronFailedAlert } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn(), updateMany: vi.fn() },
		refund: { aggregate: vi.fn() },
	},
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

import { alertOverbilledOrders } from "../alert-overbilled-orders.service";

function buildOverbilled(
	overrides: Partial<{
		id: string;
		orderNumber: string;
		total: number;
		overbilledAmountCents: number;
	}> = {},
) {
	return {
		id: overrides.id ?? "order-1",
		orderNumber: overrides.orderNumber ?? "SYN-001",
		total: overrides.total ?? 5000,
		overbilledAmountCents: overrides.overbilledAmountCents ?? 200,
	};
}

describe("alertOverbilledOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
	});

	it("returns zero counts and does not alert when no overbilled order exists", async () => {
		const result = await alertOverbilledOrders();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0 });
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	it("queries only unresolved overbilled orders", async () => {
		await alertOverbilledOrders();

		const where = mockPrisma.order.findMany.mock.calls[0]![0].where;
		expect(where.overbilledAmountCents).toEqual({ not: null });
		expect(where.overbillingResolvedAt).toBeNull();
		expect(where.deletedAt).toBeNull();
	});

	it("auto-resolves when COMPLETED refunds cover the overbilled delta", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildOverbilled({ overbilledAmountCents: 200 })]);
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 200 } });

		const result = await alertOverbilledOrders();

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			where: { id: "order-1", overbillingResolvedAt: null },
			data: { overbillingResolvedAt: expect.any(Date) },
		});
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 1, skipped: 0 });
	});

	it("re-alerts (without resolving) when refunds do not cover the delta", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildOverbilled({ overbilledAmountCents: 500 })]);
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 100 } });

		const result = await alertOverbilledOrders();

		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				job: "alert-overbilled-orders",
				errors: 1,
				details: expect.objectContaining({ issue: "unresolved-overbilling" }),
			}),
		);
		expect(result).toMatchObject({ processed: 0, skipped: 1 });
	});
});
