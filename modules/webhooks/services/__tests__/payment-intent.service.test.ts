import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockTx,
	mockPrisma,
	mockStripeRefunds,
	mockSendAdminRefundFailedAlert,
	mockGetBaseUrl,
	mockRoutes,
} = vi.hoisted(() => {
	const mockTx = {
		order: {
			findUnique: vi.fn(),
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
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			productSku: {
				update: vi.fn(),
			},
		},
		mockStripeRefunds: {
			create: vi.fn(),
		},
		mockSendAdminRefundFailedAlert: vi.fn(),
		mockGetBaseUrl: vi.fn().mockReturnValue("https://synclune.fr"),
		mockRoutes: {
			ADMIN: {
				ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
			},
		},
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		refunds: mockStripeRefunds,
	},
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: mockSendAdminRefundFailedAlert,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: mockRoutes,
}));

import {
	markOrderAsPaid,
	extractPaymentFailureDetails,
	restoreStockForOrder,
	markOrderAsFailed,
	markOrderAsCancelled,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "../payment-intent.service";
import type { PaymentFailureDetails } from "../payment-intent.service";

// ============================================================================
// markOrderAsPaid
// ============================================================================

describe("markOrderAsPaid", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx)
		);
	});

	it("should update order to PAID and PROCESSING on happy path", async () => {
		mockTx.order.findUnique.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		await markOrderAsPaid("order-1", "pi_abc123");

		expect(mockTx.order.findUnique).toHaveBeenCalledWith({
			where: { id: "order-1" },
			select: { paymentStatus: true },
		});
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

	it("should skip update when order is already PAID (idempotent)", async () => {
		mockTx.order.findUnique.mockResolvedValue({ paymentStatus: "PAID" });

		await markOrderAsPaid("order-1", "pi_abc123");

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should handle order not found gracefully without throwing", async () => {
		mockTx.order.findUnique.mockResolvedValue(null);

		await expect(markOrderAsPaid("nonexistent-order", "pi_abc123")).resolves.toBeUndefined();

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});
});

// ============================================================================
// extractPaymentFailureDetails
// ============================================================================

describe("extractPaymentFailureDetails", () => {
	it("should extract error code, decline code and message from last_payment_error", () => {
		const paymentIntent = {
			last_payment_error: {
				code: "card_declined",
				decline_code: "insufficient_funds",
				message: "Your card has insufficient funds.",
			},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;

		const result = extractPaymentFailureDetails(paymentIntent);

		expect(result).toEqual({
			code: "card_declined",
			declineCode: "insufficient_funds",
			message: "Your card has insufficient funds.",
		});
	});

	it("should return null values when last_payment_error is absent", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const paymentIntent = { last_payment_error: null } as any;

		const result = extractPaymentFailureDetails(paymentIntent);

		expect(result).toEqual({
			code: null,
			declineCode: null,
			message: null,
		});
	});
});

// ============================================================================
// restoreStockForOrder
// ============================================================================

describe("restoreStockForOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx)
		);
	});

	it("should restore stock when order was PROCESSING", async () => {
		const order = {
			id: "order-1",
			orderNumber: "SYN-001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [
				{ skuId: "sku-a", quantity: 2 },
				{ skuId: "sku-b", quantity: 1 },
			],
		};
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-a", inventory: 0, isActive: false },
			{ id: "sku-b", inventory: 3, isActive: true },
		]);
		mockTx.productSku.update.mockResolvedValue({});

		const result = await restoreStockForOrder("order-1");

		expect(result.shouldRestore).toBe(true);
		expect(result.itemCount).toBe(2);
		expect(result.restoredSkuIds).toContain("sku-a");
		expect(result.restoredSkuIds).toContain("sku-b");
		expect(mockTx.productSku.update).toHaveBeenCalledTimes(2);
	});

	it("should not restore stock when order status is PENDING", async () => {
		const order = {
			id: "order-2",
			orderNumber: "SYN-002",
			status: "PENDING",
			paymentStatus: "PENDING",
			items: [{ skuId: "sku-a", quantity: 3 }],
		};
		mockTx.order.findUnique.mockResolvedValue(order);

		const result = await restoreStockForOrder("order-2");

		expect(result.shouldRestore).toBe(false);
		expect(result.itemCount).toBe(0);
		expect(result.restoredSkuIds).toEqual([]);
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
	});

	it("should handle order not found gracefully", async () => {
		mockTx.order.findUnique.mockResolvedValue(null);

		const result = await restoreStockForOrder("nonexistent-order");

		expect(result).toEqual({ shouldRestore: false, itemCount: 0, restoredSkuIds: [] });
	});

	it("should group quantities by skuId when the same SKU appears in multiple items", async () => {
		const order = {
			id: "order-3",
			orderNumber: "SYN-003",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [
				{ skuId: "sku-a", quantity: 2 },
				{ skuId: "sku-a", quantity: 3 },
				{ skuId: "sku-b", quantity: 1 },
			],
		};
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.productSku.findMany.mockResolvedValue([
			{ id: "sku-a", inventory: 0, isActive: false },
			{ id: "sku-b", inventory: 5, isActive: true },
		]);
		mockTx.productSku.update.mockResolvedValue({});

		const result = await restoreStockForOrder("order-3");

		// Two distinct SKUs → two update calls
		expect(mockTx.productSku.update).toHaveBeenCalledTimes(2);

		// sku-a should be incremented by 5 (2+3)
		expect(mockTx.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-a" },
				data: expect.objectContaining({
					inventory: { increment: 5 },
				}),
			})
		);

		// sku-b should be incremented by 1
		expect(mockTx.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-b" },
				data: expect.objectContaining({
					inventory: { increment: 1 },
				}),
			})
		);

		expect(result.restoredSkuIds).toHaveLength(2);
		expect(result.itemCount).toBe(3);
	});

	it("should only reactivate SKUs that were auto-deactivated (inventory === 0)", async () => {
		const order = {
			id: "order-4",
			orderNumber: "SYN-004",
			status: "PROCESSING",
			paymentStatus: "PAID",
			items: [
				{ skuId: "sku-auto-deactivated", quantity: 1 },
				{ skuId: "sku-manually-deactivated", quantity: 1 },
			],
		};
		mockTx.order.findUnique.mockResolvedValue(order);
		mockTx.productSku.findMany.mockResolvedValue([
			// Auto-deactivated: inventory=0 and inactive → should reactivate
			{ id: "sku-auto-deactivated", inventory: 0, isActive: false },
			// Manually deactivated: inventory>0 but inactive → should NOT reactivate
			{ id: "sku-manually-deactivated", inventory: 5, isActive: false },
		]);
		mockTx.productSku.update.mockResolvedValue({});

		await restoreStockForOrder("order-4");

		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-auto-deactivated" },
			data: { inventory: { increment: 1 }, isActive: true },
		});

		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-manually-deactivated" },
			data: { inventory: { increment: 1 } },
		});
	});
});

// ============================================================================
// markOrderAsFailed
// ============================================================================

describe("markOrderAsFailed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx)
		);
	});

	it("should update order with FAILED payment status, CANCELLED status and failure details", async () => {
		mockTx.order.findUnique.mockResolvedValue({ paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		const failureDetails: PaymentFailureDetails = {
			code: "card_declined",
			declineCode: "do_not_honor",
			message: "Your card was declined.",
		};

		await markOrderAsFailed("order-1", "pi_failed123", failureDetails);

		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: expect.objectContaining({
				paymentStatus: "FAILED",
				status: "CANCELLED",
				stripePaymentIntentId: "pi_failed123",
				paymentFailureCode: "card_declined",
				paymentDeclineCode: "do_not_honor",
				paymentFailureMessage: "Your card was declined.",
			}),
		});
	});

	it("should skip update when order is already FAILED (idempotent)", async () => {
		mockTx.order.findUnique.mockResolvedValue({ paymentStatus: "FAILED" });

		const failureDetails: PaymentFailureDetails = {
			code: "card_declined",
			declineCode: null,
			message: null,
		};

		await markOrderAsFailed("order-1", "pi_failed123", failureDetails);

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should handle order not found gracefully without throwing", async () => {
		mockTx.order.findUnique.mockResolvedValue(null);

		const failureDetails: PaymentFailureDetails = {
			code: null,
			declineCode: null,
			message: null,
		};

		await expect(markOrderAsFailed("nonexistent", "pi_x", failureDetails)).resolves.toBeUndefined();
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});
});

// ============================================================================
// markOrderAsCancelled
// ============================================================================

describe("markOrderAsCancelled", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx)
		);
	});

	it("should update order to CANCELLED status with FAILED payment status", async () => {
		mockTx.order.findUnique.mockResolvedValue({ status: "PENDING", paymentStatus: "PENDING" });
		mockTx.order.update.mockResolvedValue({});

		await markOrderAsCancelled("order-1", "pi_cancelled123");

		expect(mockTx.order.findUnique).toHaveBeenCalledWith({
			where: { id: "order-1" },
			select: { status: true, paymentStatus: true },
		});
		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: expect.objectContaining({
				status: "CANCELLED",
				paymentStatus: "FAILED",
				stripePaymentIntentId: "pi_cancelled123",
			}),
		});
	});

	it("should skip update when order is already CANCELLED with FAILED payment (idempotent)", async () => {
		mockTx.order.findUnique.mockResolvedValue({ status: "CANCELLED", paymentStatus: "FAILED" });

		await markOrderAsCancelled("order-1", "pi_cancelled123");

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should handle order not found gracefully without throwing", async () => {
		mockTx.order.findUnique.mockResolvedValue(null);

		await expect(markOrderAsCancelled("nonexistent-order", "pi_cancelled123")).resolves.toBeUndefined();

		expect(mockTx.order.update).not.toHaveBeenCalled();
	});
});

// ============================================================================
// initiateAutomaticRefund
// ============================================================================

describe("initiateAutomaticRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create a refund via Stripe and return success with refundId", async () => {
		mockStripeRefunds.create.mockResolvedValue({ id: "re_abc123" });

		const result = await initiateAutomaticRefund("pi_xyz", "order-1", "payment_failed");

		expect(result).toEqual({ success: true, refundId: "re_abc123" });
		expect(mockStripeRefunds.create).toHaveBeenCalledWith(
			expect.objectContaining({
				payment_intent: "pi_xyz",
				reason: "requested_by_customer",
				metadata: expect.objectContaining({
					orderId: "order-1",
					reason: "payment_failed",
				}),
			}),
			expect.any(Object)
		);
	});

	it("should use a stable idempotency key based only on paymentIntentId", async () => {
		mockStripeRefunds.create.mockResolvedValue({ id: "re_stable" });

		await initiateAutomaticRefund("pi_stable123", "order-1", "some reason text");

		const [, options] = mockStripeRefunds.create.mock.calls[0];
		expect(options.idempotencyKey).toBe("auto-refund-pi_stable123");
		// Key must NOT include the reason string
		expect(options.idempotencyKey).not.toContain("some reason text");
	});

	it("should return error on Stripe failure without throwing", async () => {
		const stripeError = new Error("Stripe API unavailable");
		mockStripeRefunds.create.mockRejectedValue(stripeError);

		const result = await initiateAutomaticRefund("pi_bad", "order-1", "payment_failed");

		expect(result.success).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe("Stripe API unavailable");
		expect(result.refundId).toBeUndefined();
	});
});

// ============================================================================
// sendRefundFailureAlert
// ============================================================================

describe("sendRefundFailureAlert", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
	});

	it("should fetch order and send admin alert email with correct data", async () => {
		const order = {
			orderNumber: "SYN-042",
			total: 9900,
			user: { email: "client@example.com" },
		};
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSendAdminRefundFailedAlert.mockResolvedValue(undefined);

		await sendRefundFailureAlert("order-42", "pi_xyz", "payment_failed", "Insufficient funds");

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
			where: { id: "order-42" },
			select: expect.objectContaining({
				orderNumber: true,
				total: true,
			}),
		});

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				orderNumber: "SYN-042",
				customerEmail: "client@example.com",
				amount: 9900,
				reason: "payment_failed",
				errorMessage: "Insufficient funds",
				stripePaymentIntentId: "pi_xyz",
				dashboardUrl: "https://synclune.fr/admin/ventes/commandes/order-42",
			})
		);
	});

	it("should handle missing order gracefully without throwing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		await expect(
			sendRefundFailureAlert("nonexistent-order", "pi_xyz", "other", "Unknown error")
		).resolves.toBeUndefined();

		expect(mockSendAdminRefundFailedAlert).not.toHaveBeenCalled();
	});
});
