import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockPrisma,
	mockTx,
	mockCreateStripeRefund,
	mockUpdateTag,
} = vi.hoisted(() => {
	const mockTx = {
		$queryRaw: vi.fn(),
		refund: { update: vi.fn() },
		productSku: { update: vi.fn() },
		order: { update: vi.fn() },
	};

	return {
		mockRequireAdminWithUser: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockPrisma: {
			$transaction: vi.fn(),
			refund: { update: vi.fn() },
			productSku: { findMany: vi.fn() },
		},
		mockTx,
		mockCreateStripeRefund: vi.fn(),
		mockUpdateTag: vi.fn(),
	};
});

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	REFUND_LIMITS: { PROCESS: "process" },
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));

vi.mock("@/shared/types/server-action", () => ({
	ActionStatus: {
		SUCCESS: "success",
		ERROR: "error",
		NOT_FOUND: "not_found",
		UNAUTHORIZED: "unauthorized",
		FORBIDDEN: "forbidden",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("../../lib/stripe-refund", () => ({
	createStripeRefund: mockCreateStripeRefund,
}));

vi.mock("../../schemas/refund.schemas", () => ({
	processRefundSchema: {},
}));

vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		NOT_FOUND: "Le remboursement n'existe pas.",
		ALREADY_PROCESSED: "Ce remboursement a déjà été traité.",
		NOT_APPROVED: "Ce remboursement doit d'abord être approuvé avant d'être traité.",
		NO_CHARGE_ID: "Impossible de rembourser : aucun ID de paiement Stripe trouvé.",
		STRIPE_ERROR: "Erreur lors du remboursement Stripe.",
		PROCESS_FAILED: "Erreur lors du traitement du remboursement.",
	},
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
		LAST_ORDER: (userId: string) => `last-order-user-${userId}`,
		ACCOUNT_STATS: (userId: string) => `account-stats-${userId}`,
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		ADMIN_ORDERS_LIST: "admin-orders-list",
		ADMIN_INVENTORY_LIST: "admin-inventory-list",
	},
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		SKU_STOCK: (skuId: string) => `sku-stock-${skuId}`,
		SKUS: (productId: string) => `product-${productId}-skus`,
		DETAIL: (slug: string) => `product-${slug}`,
	},
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({}));

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {},
	PaymentStatus: {
		REFUNDED: "REFUNDED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
	},
	RefundStatus: {
		FAILED: "FAILED",
		COMPLETED: "COMPLETED",
		APPROVED: "APPROVED",
	},
}));

// Mock stripe to avoid API key requirement
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {},
}));

import { processRefund } from "../process-refund";

// ============================================================================
// Fixtures
// ============================================================================

function makeFormData(id = "refund-1") {
	const fd = new FormData();
	fd.set("id", id);
	return fd;
}

function makeRefundRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-1",
		status: "APPROVED",
		amount: 5000,
		reason: "CUSTOMER_REQUEST",
		order_id: "order-1",
		order_number: "SYN-001",
		order_total: 10000,
		order_user_id: "user-1",
		stripe_payment_intent_id: "pi_123",
		...overrides,
	};
}

const mockAdmin = {
	id: "admin-1",
	email: "admin@test.com",
	name: "Admin",
	role: "ADMIN",
	image: null,
	firstName: "Admin",
	lastName: "Test",
	emailVerified: true,
	stripeCustomerId: null,
};

// ============================================================================
// processRefund
// ============================================================================

describe("processRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default happy path setup
		mockRequireAdminWithUser.mockResolvedValue({ user: mockAdmin });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ success: true, data: { id: "refund-1" } });
		mockSuccess.mockImplementation((msg: string) => ({ status: "success", message: msg }));
		mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: "error",
			message: msg,
		}));
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: "forbidden", message: "Accès non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await processRefund(undefined, makeFormData());

		expect(result).toBe(authError);
	});

	it("should return rate limit error", async () => {
		const rlError = { status: "error", message: "Rate limited" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await processRefund(undefined, makeFormData());

		expect(result).toBe(rlError);
	});

	it("should return validation error when id is invalid", async () => {
		const valError = { status: "error", message: "Invalid id" };
		mockValidateInput.mockReturnValue({ error: valError });

		const result = await processRefund(undefined, makeFormData("bad"));

		expect(result).toBe(valError);
	});

	it("should return NOT_FOUND when refund does not exist", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw.mockResolvedValueOnce([]); // No refund rows

		const result = await processRefund(undefined, makeFormData());

		expect(result).toEqual({
			status: "not_found",
			message: "Le remboursement n'existe pas.",
		});
	});

	it("should return ALREADY_PROCESSED when refund is COMPLETED", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw.mockResolvedValueOnce([makeRefundRow({ status: "COMPLETED" })]);

		const result = await processRefund(undefined, makeFormData());

		expect(result).toEqual({
			status: "error",
			message: "Ce remboursement a déjà été traité.",
		});
	});

	it("should return NOT_APPROVED when refund is not in APPROVED status", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw.mockResolvedValueOnce([makeRefundRow({ status: "PENDING" })]);

		const result = await processRefund(undefined, makeFormData());

		expect(result).toEqual({
			status: "error",
			message: "Ce remboursement doit d'abord être approuvé avant d'être traité.",
		});
	});

	it("should return NO_CHARGE_ID when no stripePaymentIntentId", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw.mockResolvedValueOnce([
			makeRefundRow({ stripe_payment_intent_id: null }),
		]);

		const result = await processRefund(undefined, makeFormData());

		expect(result).toEqual({
			status: "error",
			message: "Impossible de rembourser : aucun ID de paiement Stripe trouvé.",
		});
	});

	it("should mark FAILED when Stripe returns neither success nor pending", async () => {
		// First transaction: lock + validate
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])   // refund lock
			.mockResolvedValueOnce([])                   // refund items
			.mockResolvedValueOnce([]);                  // completed refunds

		mockCreateStripeRefund.mockResolvedValue({
			success: false,
			pending: false,
			error: "Card was declined",
		});

		const result = await processRefund(undefined, makeFormData());

		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "refund-1" },
				data: expect.objectContaining({ status: "FAILED" }),
			}),
		);
		expect(result).toEqual({ status: "error", message: "Card was declined" });
	});

	it("should return pending message when Stripe returns pending", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);

		mockCreateStripeRefund.mockResolvedValue({
			success: false,
			pending: true,
			refundId: "re_pending_123",
		});

		const result = await processRefund(undefined, makeFormData());

		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ stripeRefundId: "re_pending_123" }),
			}),
		);
		expect(result).toEqual({
			status: "success",
			message: expect.stringContaining("50.00"),
			data: { stripeRefundId: "re_pending_123", pending: true },
		});
	});

	it("should complete refund and update status to COMPLETED on success", async () => {
		// First transaction: lock
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);

		mockCreateStripeRefund.mockResolvedValue({
			success: true,
			refundId: "re_success_123",
		});

		// Second transaction: finalize
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockPrisma.productSku.findMany.mockResolvedValue([]);

		const result = await processRefund(undefined, makeFormData());

		expect(mockTx.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "COMPLETED",
					stripeRefundId: "re_success_123",
				}),
			}),
		);
		expect(result).toEqual({
			status: "success",
			message: expect.stringContaining("50.00"),
			data: { stripeRefundId: "re_success_123" },
		});
	});

	it("should restock inventory for items with restock: true", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([
				{ id: "ri-1", quantity: 2, restock: true, sku_id: "sku-1" },
				{ id: "ri-2", quantity: 1, restock: false, sku_id: "sku-2" },
			])
			.mockResolvedValueOnce([]);

		mockCreateStripeRefund.mockResolvedValue({ success: true, refundId: "re_123" });

		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockPrisma.productSku.findMany.mockResolvedValue([
			{ productId: "prod-1", product: { slug: "bracelet-lune" } },
		]);

		await processRefund(undefined, makeFormData());

		// Should restock sku-1 (restock: true)
		expect(mockTx.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-1" },
			data: { inventory: { increment: 2 } },
		});
	});

	it("should skip restock gracefully if SKU is deleted", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([
				{ id: "ri-1", quantity: 1, restock: true, sku_id: "sku-deleted" },
			])
			.mockResolvedValueOnce([]);

		mockCreateStripeRefund.mockResolvedValue({ success: true, refundId: "re_123" });

		// Second transaction: productSku.update throws (SKU deleted)
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.productSku.update.mockRejectedValueOnce(new Error("Record not found"));
		mockPrisma.productSku.findMany.mockResolvedValue([]);

		// Should not throw - just warn and continue
		const result = await processRefund(undefined, makeFormData());

		expect(result.status).toBe("success");
	});

	it("should set REFUNDED when total refunded >= order total", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow({ amount: 10000, order_total: 10000 })])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]); // No previous refunds

		mockCreateStripeRefund.mockResolvedValue({ success: true, refundId: "re_123" });

		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockPrisma.productSku.findMany.mockResolvedValue([]);

		await processRefund(undefined, makeFormData());

		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { paymentStatus: "REFUNDED" },
			}),
		);
	});

	it("should set PARTIALLY_REFUNDED when partial", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow({ amount: 3000, order_total: 10000 })])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]); // No previous refunds

		mockCreateStripeRefund.mockResolvedValue({ success: true, refundId: "re_123" });

		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockPrisma.productSku.findMany.mockResolvedValue([]);

		await processRefund(undefined, makeFormData());

		expect(mockTx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { paymentStatus: "PARTIALLY_REFUNDED" },
			}),
		);
	});

	it("should invalidate cache tags including user-specific and inventory when restocked", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([
				{ id: "ri-1", quantity: 1, restock: true, sku_id: "sku-1" },
			])
			.mockResolvedValueOnce([]);

		mockCreateStripeRefund.mockResolvedValue({ success: true, refundId: "re_123" });

		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockPrisma.productSku.findMany.mockResolvedValue([
			{ productId: "prod-1", product: { slug: "bracelet-lune" } },
		]);

		await processRefund(undefined, makeFormData());

		// Should invalidate order-related tags
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("order-refunds-order-1");

		// Should invalidate user-specific tags
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-user-user-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("last-order-user-user-1");

		// Should invalidate inventory tags for restocked items
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-inventory-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("sku-stock-sku-1");
	});

	it("should include formatted amount in success message", async () => {
		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow({ amount: 12345 })])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);

		mockCreateStripeRefund.mockResolvedValue({ success: true, refundId: "re_123" });

		mockPrisma.$transaction.mockImplementationOnce(
			async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
		);
		mockPrisma.productSku.findMany.mockResolvedValue([]);

		const result = await processRefund(undefined, makeFormData());

		expect(result.message).toContain("123.45");
	});
});
