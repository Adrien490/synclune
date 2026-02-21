import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockMarkOrderAsPaid,
	mockExtractPaymentFailureDetails,
	mockRestoreStockForOrder,
	mockMarkOrderAsFailed,
	mockMarkOrderAsCancelled,
	mockInitiateAutomaticRefund,
	mockSendRefundFailureAlert,
	mockBuildUrl,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findFirst: vi.fn() },
	},
	mockMarkOrderAsPaid: vi.fn(),
	mockExtractPaymentFailureDetails: vi.fn(),
	mockRestoreStockForOrder: vi.fn(),
	mockMarkOrderAsFailed: vi.fn(),
	mockMarkOrderAsCancelled: vi.fn(),
	mockInitiateAutomaticRefund: vi.fn(),
	mockSendRefundFailureAlert: vi.fn(),
	mockBuildUrl: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("../../services/payment-intent.service", () => ({
	markOrderAsPaid: mockMarkOrderAsPaid,
	extractPaymentFailureDetails: mockExtractPaymentFailureDetails,
	restoreStockForOrder: mockRestoreStockForOrder,
	markOrderAsFailed: mockMarkOrderAsFailed,
	markOrderAsCancelled: mockMarkOrderAsCancelled,
	initiateAutomaticRefund: mockInitiateAutomaticRefund,
	sendRefundFailureAlert: mockSendRefundFailureAlert,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		ADMIN_ORDERS_LIST: "admin-orders-list",
	},
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		SKU_STOCK: (skuId: string) => `sku-stock-${skuId}`,
	},
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		ADMIN: {
			ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
			ORDERS: "/admin/ventes/commandes",
		},
	},
}));

// Mock stripe to avoid API key requirement
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {},
}));

import type Stripe from "stripe";
import {
	handlePaymentSuccess,
	handlePaymentFailure,
	handlePaymentCanceled,
	handleInvoicePaymentFailed,
} from "../payment-handlers";

// ============================================================================
// Fixtures
// ============================================================================

function makePaymentIntent(overrides: Record<string, unknown> = {}) {
	return {
		id: "pi_123",
		status: "succeeded",
		metadata: { order_id: "order-1" },
		amount_received: 0,
		...overrides,
	} as unknown as Stripe.PaymentIntent;
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
	return {
		id: "in_123",
		number: "INV-001",
		metadata: { orderId: "order-1" },
		customer_email: "client@example.com",
		amount_due: 10000,
		status: "open",
		last_finalization_error: null,
		...overrides,
	} as unknown as Stripe.Invoice;
}

// ============================================================================
// handlePaymentSuccess
// ============================================================================

describe("handlePaymentSuccess", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should call markOrderAsPaid with orderId and paymentIntentId", async () => {
		mockMarkOrderAsPaid.mockResolvedValue(undefined);

		await handlePaymentSuccess(makePaymentIntent());

		expect(mockMarkOrderAsPaid).toHaveBeenCalledWith("order-1", "pi_123");
	});

	it("should not call markOrderAsPaid when no order_id in metadata (warn only)", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		await handlePaymentSuccess(makePaymentIntent({ metadata: {} }));

		expect(mockMarkOrderAsPaid).not.toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("payment_intent.succeeded without order_id"),
		);
		warnSpy.mockRestore();
	});
});

// ============================================================================
// handlePaymentFailure
// ============================================================================

describe("handlePaymentFailure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockExtractPaymentFailureDetails.mockReturnValue({
			code: "card_declined",
			declineCode: "insufficient_funds",
			message: "Your card was declined.",
		});
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [] });
		mockMarkOrderAsFailed.mockResolvedValue(undefined);
	});

	it("should throw when no order_id in metadata", async () => {
		await expect(
			handlePaymentFailure(makePaymentIntent({ metadata: {} })),
		).rejects.toThrow("No order_id in payment intent metadata");
	});

	it("should call restoreStockForOrder and markOrderAsFailed in order", async () => {
		await handlePaymentFailure(makePaymentIntent());

		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-1");
		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith(
			"order-1",
			"pi_123",
			expect.objectContaining({ code: "card_declined" }),
		);
	});

	it("should initiate auto refund when amount_received > 0", async () => {
		mockInitiateAutomaticRefund.mockResolvedValue({ success: true });

		await handlePaymentFailure(makePaymentIntent({ amount_received: 5000 }));

		expect(mockInitiateAutomaticRefund).toHaveBeenCalledWith(
			"pi_123",
			"order-1",
			"Payment failed, automatic refund",
		);
	});

	it("should alert admin when auto refund fails", async () => {
		mockInitiateAutomaticRefund.mockResolvedValue({
			success: false,
			error: { message: "Refund failed" },
		});
		mockSendRefundFailureAlert.mockResolvedValue(undefined);

		await handlePaymentFailure(makePaymentIntent({ amount_received: 5000 }));

		expect(mockSendRefundFailureAlert).toHaveBeenCalledWith(
			"order-1",
			"pi_123",
			"payment_failed",
			"Refund failed",
		);
	});

	it("should not initiate refund when amount_received is 0", async () => {
		await handlePaymentFailure(makePaymentIntent({ amount_received: 0 }));

		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
	});

	it("should include restored SKU ids in cache tags", async () => {
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: ["sku-1", "sku-2"] });

		const result = await handlePaymentFailure(makePaymentIntent());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("sku-stock-sku-1");
			expect(cacheTask.tags).toContain("sku-stock-sku-2");
		}
	});
});

// ============================================================================
// handlePaymentCanceled
// ============================================================================

describe("handlePaymentCanceled", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [] });
		mockMarkOrderAsCancelled.mockResolvedValue(undefined);
	});

	it("should throw when no order_id in metadata", async () => {
		await expect(
			handlePaymentCanceled(makePaymentIntent({ metadata: {} })),
		).rejects.toThrow("No order_id in payment intent metadata");
	});

	it("should call restoreStockForOrder and markOrderAsCancelled", async () => {
		await handlePaymentCanceled(makePaymentIntent());

		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-1");
		expect(mockMarkOrderAsCancelled).toHaveBeenCalledWith("order-1", "pi_123");
	});

	it("should initiate auto refund when status is canceled and amount_received > 0", async () => {
		mockInitiateAutomaticRefund.mockResolvedValue({ success: true });

		await handlePaymentCanceled(
			makePaymentIntent({ status: "canceled", amount_received: 5000 }),
		);

		expect(mockInitiateAutomaticRefund).toHaveBeenCalledWith(
			"pi_123",
			"order-1",
			"Payment canceled, automatic refund",
		);
	});

	it("should alert admin when auto refund fails on cancelation", async () => {
		mockInitiateAutomaticRefund.mockResolvedValue({
			success: false,
			error: { message: "Refund error" },
		});
		mockSendRefundFailureAlert.mockResolvedValue(undefined);

		await handlePaymentCanceled(
			makePaymentIntent({ status: "canceled", amount_received: 5000 }),
		);

		expect(mockSendRefundFailureAlert).toHaveBeenCalledWith(
			"order-1",
			"pi_123",
			"payment_canceled",
			"Refund error",
		);
	});

	it("should not refund when amount_received is 0 even if status is canceled", async () => {
		await handlePaymentCanceled(
			makePaymentIntent({ status: "canceled", amount_received: 0 }),
		);

		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
	});

	it("should not refund when status is not canceled even if amount > 0", async () => {
		await handlePaymentCanceled(
			makePaymentIntent({ status: "requires_payment_method", amount_received: 5000 }),
		);

		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
	});

	it("should include restored SKU ids in cache tags", async () => {
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: ["sku-3"] });

		const result = await handlePaymentCanceled(makePaymentIntent());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("sku-stock-sku-3");
		}
	});
});

// ============================================================================
// handleInvoicePaymentFailed
// ============================================================================

describe("handleInvoicePaymentFailed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBuildUrl.mockImplementation((path: string) => `https://synclune.fr${path}`);
	});

	it("should find order by metadata.orderId", async () => {
		const order = {
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			stripePaymentIntentId: "pi_123",
		};
		mockPrisma.order.findFirst.mockResolvedValue(order);

		const result = await handleInvoicePaymentFailed(makeInvoice());

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "order-1" }),
			}),
		);
		expect(result.success).toBe(true);
	});

	it("should work without order found (fallback on invoice data)", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await handleInvoicePaymentFailed(
			makeInvoice({ metadata: { orderId: "order-missing" } }),
		);

		expect(result.success).toBe(true);
		const alertTask = result.tasks?.find((t) => t.type === "ADMIN_INVOICE_FAILED_ALERT");
		if (alertTask?.type === "ADMIN_INVOICE_FAILED_ALERT") {
			expect(alertTask.data.orderNumber).toBe("INV-001");
			expect(alertTask.data.customerEmail).toBe("client@example.com");
		}
	});

	it("should work without orderId in metadata", async () => {
		const result = await handleInvoicePaymentFailed(
			makeInvoice({ metadata: {} }),
		);

		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		expect(result.success).toBe(true);
	});

	it("should return admin alert and cache invalidation tasks", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await handleInvoicePaymentFailed(makeInvoice());

		const alertTask = result.tasks?.find((t) => t.type === "ADMIN_INVOICE_FAILED_ALERT");
		expect(alertTask).toBeDefined();
		if (alertTask?.type === "ADMIN_INVOICE_FAILED_ALERT") {
			expect(alertTask.data.amount).toBe(10000);
		}

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("orders-list");
			expect(cacheTask.tags).toContain("admin-badges");
		}
	});

	it("should use last_finalization_error message when available", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await handleInvoicePaymentFailed(
			makeInvoice({
				last_finalization_error: { message: "Card expired" },
			}),
		);

		const alertTask = result.tasks?.find((t) => t.type === "ADMIN_INVOICE_FAILED_ALERT");
		if (alertTask?.type === "ADMIN_INVOICE_FAILED_ALERT") {
			expect(alertTask.data.errorMessage).toBe("Card expired");
		}
	});
});
