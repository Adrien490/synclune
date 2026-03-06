import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockTx, mockPrisma, mockStripeRefunds, mockSendAdminRefundFailedAlert } = vi.hoisted(() => {
	const mockTx = {
		order: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		productSku: {
			findMany: vi.fn(),
			update: vi.fn(),
		},
	};

	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn(),
			order: {
				findFirst: vi.fn(),
				update: vi.fn(),
			},
		},
		mockStripeRefunds: {
			create: vi.fn(),
		},
		mockSendAdminRefundFailedAlert: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: { refunds: mockStripeRefunds },
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: mockSendAdminRefundFailedAlert,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: vi.fn().mockReturnValue("https://synclune.fr"),
	ROUTES: {
		ADMIN: {
			ORDER_DETAIL: (id: string) => `/admin/ventes/commandes/${id}`,
		},
	},
}));

import {
	markOrderAsPaid,
	restoreStockForOrder,
	markOrderAsFailed,
	markOrderAsCancelled,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "../payment-intent.service";

// ============================================================================
// markOrderAsPaid — Idempotency
// ============================================================================

describe("markOrderAsPaid — idempotency", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
	});

	it("should mark order as PAID and set paidAt timestamp", async () => {
		mockTx.order.findFirst.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		await markOrderAsPaid("order-1", "pi_abc123");

		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: expect.objectContaining({
				status: "PROCESSING",
				paymentStatus: "PAID",
				stripePaymentIntentId: "pi_abc123",
				paidAt: expect.any(Date),
			}),
		});
	});

	it("should be idempotent — already PAID order returns early without DB update", async () => {
		mockTx.order.findFirst.mockResolvedValue({ paymentStatus: "PAID" });

		await markOrderAsPaid("order-1", "pi_abc123");

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should not throw when order is not found", async () => {
		mockTx.order.findFirst.mockResolvedValue(null);

		await expect(markOrderAsPaid("missing", "pi_abc123")).resolves.toBeUndefined();

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should process PENDING order on concurrent calls — only first updates", async () => {
		let callCount = 0;
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) => {
			callCount++;
			if (callCount === 1) {
				mockTx.order.findFirst.mockResolvedValue({ paymentStatus: "PENDING" });
			} else {
				mockTx.order.findFirst.mockResolvedValue({ paymentStatus: "PAID" });
			}
			mockTx.order.update.mockResolvedValue({});
			return cb(mockTx);
		});

		await Promise.all([
			markOrderAsPaid("order-1", "pi_abc123"),
			markOrderAsPaid("order-1", "pi_abc123"),
		]);

		// Only one update call (the second sees PAID and skips)
		expect(mockTx.order.update).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// restoreStockForOrder — Stock restoration
// ============================================================================

describe("restoreStockForOrder — idempotency & edge cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
	});

	it("should restore stock for all order items on PROCESSING order", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [
				{ skuId: "sku-1", quantity: 2 },
				{ skuId: "sku-2", quantity: 3 },
			],
		});
		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-1", inventory: 5, isActive: true },
			{ id: "sku-2", inventory: 3, isActive: true },
		]);
		mockTx.productSku.update.mockResolvedValue({});

		const result = await restoreStockForOrder("order-1");

		expect(result.shouldRestore).toBe(true);
		expect(result.itemCount).toBe(2);
		expect(result.restoredSkuIds).toEqual(expect.arrayContaining(["sku-1", "sku-2"]));
	});

	it("should aggregate quantities when same SKU appears in multiple order items", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [
				{ skuId: "sku-1", quantity: 2 },
				{ skuId: "sku-1", quantity: 3 },
			],
		});
		mockTx.productSku.findMany.mockResolvedValue([{ id: "sku-1", inventory: 0, isActive: false }]);
		mockTx.productSku.update.mockResolvedValue({});

		await restoreStockForOrder("order-1");

		// Should increment by total (2+3=5)
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-1" },
			data: {
				inventory: { increment: 5 },
				isActive: true,
			},
		});
	});

	it("should NOT restore stock if order is still PENDING (stock not yet decremented)", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			status: "PENDING",
			paymentStatus: "PENDING",
			items: [{ skuId: "sku-1", quantity: 2 }],
		});

		const result = await restoreStockForOrder("order-1");

		expect(result.shouldRestore).toBe(false);
		expect(result.itemCount).toBe(0);
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
	});

	it("should NOT restore stock if order has no items", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [],
		});

		const result = await restoreStockForOrder("order-1");

		expect(result.shouldRestore).toBe(false);
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
	});

	it("should reactivate auto-deactivated SKU (inventory=0, isActive=false)", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [{ skuId: "sku-1", quantity: 1 }],
		});
		mockTx.productSku.findMany.mockResolvedValue([{ id: "sku-1", inventory: 0, isActive: false }]);
		mockTx.productSku.update.mockResolvedValue({});

		await restoreStockForOrder("order-1");

		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-1" },
			data: {
				inventory: { increment: 1 },
				isActive: true,
			},
		});
	});

	it("should NOT reactivate manually deactivated SKU (inventory>0, isActive=false)", async () => {
		mockTx.order.findFirst.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [{ skuId: "sku-1", quantity: 1 }],
		});
		mockTx.productSku.findMany.mockResolvedValue([{ id: "sku-1", inventory: 3, isActive: false }]);
		mockTx.productSku.update.mockResolvedValue({});

		await restoreStockForOrder("order-1");

		// Should only increment stock, NOT reactivate
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-1" },
			data: {
				inventory: { increment: 1 },
			},
		});
	});

	it("should return empty result when order not found", async () => {
		mockTx.order.findFirst.mockResolvedValue(null);

		const result = await restoreStockForOrder("missing");

		expect(result).toEqual({ shouldRestore: false, itemCount: 0, restoredSkuIds: [] });
	});
});

// ============================================================================
// markOrderAsFailed — Idempotency
// ============================================================================

describe("markOrderAsFailed — idempotency", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
	});

	it("should store failure details on first call", async () => {
		mockTx.order.findFirst.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		await markOrderAsFailed("order-1", "pi_abc123", {
			code: "card_declined",
			declineCode: "insufficient_funds",
			message: "Your card was declined.",
		});

		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: expect.objectContaining({
				paymentStatus: "FAILED",
				status: "CANCELLED",
				paymentFailureCode: "card_declined",
				paymentDeclineCode: "insufficient_funds",
				paymentFailureMessage: "Your card was declined.",
			}),
		});
	});

	it("should be idempotent — already FAILED order returns early", async () => {
		mockTx.order.findFirst.mockResolvedValue({ paymentStatus: "FAILED" });

		await markOrderAsFailed("order-1", "pi_abc123", {
			code: null,
			declineCode: null,
			message: null,
		});

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should handle null failure details gracefully", async () => {
		mockTx.order.findFirst.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		await markOrderAsFailed("order-1", "pi_abc123", {
			code: null,
			declineCode: null,
			message: null,
		});

		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					paymentFailureCode: null,
					paymentDeclineCode: null,
					paymentFailureMessage: null,
				}),
			}),
		);
	});
});

// ============================================================================
// markOrderAsCancelled — Idempotency
// ============================================================================

describe("markOrderAsCancelled — idempotency", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
	});

	it("should cancel order on first call", async () => {
		mockTx.order.findFirst.mockResolvedValue({ status: "PENDING", paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		await markOrderAsCancelled("order-1", "pi_abc123");

		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: {
				status: "CANCELLED",
				paymentStatus: "FAILED",
				stripePaymentIntentId: "pi_abc123",
			},
		});
	});

	it("should be idempotent — already CANCELLED with FAILED payment returns early", async () => {
		mockTx.order.findFirst.mockResolvedValue({ status: "CANCELLED", paymentStatus: "FAILED" });

		await markOrderAsCancelled("order-1", "pi_abc123");

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should still update if only status is CANCELLED but paymentStatus is not FAILED", async () => {
		mockTx.order.findFirst.mockResolvedValue({ status: "CANCELLED", paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		await markOrderAsCancelled("order-1", "pi_abc123");

		expect(mockTx.order.update).toHaveBeenCalled();
	});
});

// ============================================================================
// initiateAutomaticRefund — Stripe integration
// ============================================================================

describe("initiateAutomaticRefund — failure recovery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create Stripe refund with idempotency key", async () => {
		mockStripeRefunds.create.mockResolvedValue({ id: "re_abc123" });

		const result = await initiateAutomaticRefund("pi_abc123", "order-1", "Payment cancelled");

		expect(result).toEqual({ success: true, refundId: "re_abc123" });
		expect(mockStripeRefunds.create).toHaveBeenCalledWith(
			{
				payment_intent: "pi_abc123",
				reason: "requested_by_customer",
				metadata: { orderId: "order-1", reason: "Payment cancelled" },
			},
			{ idempotencyKey: "auto-refund-pi_abc123" },
		);
	});

	it("should return error when Stripe refund creation fails", async () => {
		const stripeError = new Error("Stripe API error: charge already refunded");
		mockStripeRefunds.create.mockRejectedValue(stripeError);

		const result = await initiateAutomaticRefund("pi_abc123", "order-1", "Payment failed");

		expect(result.success).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe("Stripe API error: charge already refunded");
	});

	it("should wrap non-Error thrown values", async () => {
		mockStripeRefunds.create.mockRejectedValue("string error");

		const result = await initiateAutomaticRefund("pi_abc123", "order-1", "Reason");

		expect(result.success).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe("string error");
	});
});

// ============================================================================
// sendRefundFailureAlert — Admin notification
// ============================================================================

describe("sendRefundFailureAlert", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should send admin alert with order details", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-001",
			total: 4999,
			user: { email: "client@example.com" },
		});
		mockSendAdminRefundFailedAlert.mockResolvedValue(undefined);

		await sendRefundFailureAlert("order-1", "pi_abc123", "payment_failed", "Card declined");

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith({
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			amount: 4999,
			reason: "payment_failed",
			errorMessage: "Card declined",
			stripePaymentIntentId: "pi_abc123",
			dashboardUrl: "https://synclune.fr/admin/ventes/commandes/order-1",
		});
	});

	it("should use fallback email when user has no email", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-002",
			total: 2500,
			user: null,
		});
		mockSendAdminRefundFailedAlert.mockResolvedValue(undefined);

		await sendRefundFailureAlert("order-2", "pi_xyz", "payment_canceled", "Error");

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: "Email non disponible",
			}),
		);
	});

	it("should not throw when order is not found", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		await expect(
			sendRefundFailureAlert("missing", "pi_abc", "other", "Error"),
		).resolves.toBeUndefined();

		expect(mockSendAdminRefundFailedAlert).not.toHaveBeenCalled();
	});

	it("should not throw when email service fails", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-003",
			total: 1000,
			user: { email: "test@example.com" },
		});
		mockSendAdminRefundFailedAlert.mockRejectedValue(new Error("Email service down"));

		await expect(
			sendRefundFailureAlert("order-3", "pi_abc", "other", "Error"),
		).resolves.toBeUndefined();
	});
});
