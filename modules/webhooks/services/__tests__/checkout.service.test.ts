import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStripe, mockPrisma, mockTx } = vi.hoisted(() => {
	const tx = {
		discountUsage: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		discount: {
			update: vi.fn(),
		},
		order: {
			update: vi.fn(),
		},
	};

	return {
		mockStripe: {
			checkout: {
				sessions: {
					retrieve: vi.fn(),
				},
			},
		},
		mockPrisma: {
			order: {
				findUnique: vi.fn(),
			},
			$transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
		},
		mockTx: tx,
	};
});

vi.mock("@/shared/lib/stripe", () => ({ stripe: mockStripe }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

import { retrieveCheckoutSessionForOrder, cancelExpiredOrder } from "../checkout.service";

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.discountUsage.findMany.mockResolvedValue([]);
	mockTx.discountUsage.deleteMany.mockResolvedValue({ count: 0 });
	mockTx.discount.update.mockResolvedValue({});
	mockTx.order.update.mockResolvedValue({});
});

describe("retrieveCheckoutSessionForOrder", () => {
	it("retrieves session with all expansions required for order creation", async () => {
		const session = { id: "cs_test_1" };
		mockStripe.checkout.sessions.retrieve.mockResolvedValue(session);

		const result = await retrieveCheckoutSessionForOrder("cs_test_1");

		expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_1", {
			expand: [
				"line_items",
				"line_items.data.price.product",
				"payment_intent",
				"customer",
				"shipping_cost.shipping_rate",
				"total_details.breakdown.discounts",
			],
		});
		expect(result).toBe(session);
	});
});

describe("cancelExpiredOrder", () => {
	it("returns cancelled=false when no order is linked to the session", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await cancelExpiredOrder("cs_no_order");

		expect(result).toEqual({ cancelled: false });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("skips cancellation when order is already PAID", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			paymentStatus: "PAID",
		});

		const result = await cancelExpiredOrder("cs_already_paid");

		expect(result).toEqual({ cancelled: false, orderNumber: "ORD-001" });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("skips cancellation when order is already EXPIRED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			paymentStatus: "EXPIRED",
		});

		const result = await cancelExpiredOrder("cs_already_expired");

		expect(result).toEqual({ cancelled: false, orderNumber: "ORD-001" });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("cancels PENDING order and releases discount usages", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order_1",
			orderNumber: "ORD-001",
			paymentStatus: "PENDING",
		});
		mockTx.discountUsage.findMany.mockResolvedValue([
			{ id: "usage_1", discountId: "discount_1" },
			{ id: "usage_2", discountId: "discount_2" },
		]);

		const result = await cancelExpiredOrder("cs_pending");

		expect(result).toEqual({ cancelled: true, orderNumber: "ORD-001" });
		expect(mockTx.discount.update).toHaveBeenCalledTimes(2);
		expect(mockTx.discount.update).toHaveBeenCalledWith({
			where: { id: "discount_1" },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockTx.discountUsage.deleteMany).toHaveBeenCalledWith({
			where: { orderId: "order_1" },
		});
		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order_1" },
			data: { status: "CANCELLED", paymentStatus: "EXPIRED" },
		});
	});

	it("cancels PENDING order without discount usage", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order_2",
			orderNumber: "ORD-002",
			paymentStatus: "PENDING",
		});

		const result = await cancelExpiredOrder("cs_pending_no_discount");

		expect(result).toEqual({ cancelled: true, orderNumber: "ORD-002" });
		expect(mockTx.discount.update).not.toHaveBeenCalled();
		expect(mockTx.discountUsage.deleteMany).not.toHaveBeenCalled();
		expect(mockTx.order.update).toHaveBeenCalled();
	});
});
