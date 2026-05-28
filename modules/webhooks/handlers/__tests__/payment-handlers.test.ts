import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockExtractPaymentFailureDetails,
	mockRestoreStockForOrder,
	mockMarkOrderAsFailed,
	mockMarkOrderAsCancelled,
	mockInitiateAutomaticRefund,
	mockSendRefundFailureAlert,
	mockBuildUrl,
	mockLogger,
	mockProcessOrderFromPaymentIntent,
	mockBuildPostCheckoutTasksFromPI,
	mockEnsureInvoiceNumberPersisted,
	mockRecordSalesEReporting,
	mockExtractPaymentMethod,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findFirst: vi.fn() },
	},
	mockExtractPaymentFailureDetails: vi.fn(),
	mockRestoreStockForOrder: vi.fn(),
	mockMarkOrderAsFailed: vi.fn(),
	mockMarkOrderAsCancelled: vi.fn(),
	mockInitiateAutomaticRefund: vi.fn(),
	mockSendRefundFailureAlert: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockProcessOrderFromPaymentIntent: vi.fn(),
	mockBuildPostCheckoutTasksFromPI: vi.fn(),
	mockEnsureInvoiceNumberPersisted: vi.fn().mockResolvedValue(undefined),
	mockRecordSalesEReporting: vi.fn().mockResolvedValue("skipped"),
	mockExtractPaymentMethod: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

vi.mock("../../services/payment-intent.service", () => ({
	extractPaymentFailureDetails: mockExtractPaymentFailureDetails,
	restoreStockForOrder: mockRestoreStockForOrder,
	markOrderAsFailed: mockMarkOrderAsFailed,
	markOrderAsCancelled: mockMarkOrderAsCancelled,
	initiateAutomaticRefund: mockInitiateAutomaticRefund,
	sendRefundFailureAlert: mockSendRefundFailureAlert,
}));

vi.mock("../../services/checkout.service", () => ({
	processOrderFromPaymentIntent: mockProcessOrderFromPaymentIntent,
	buildPostCheckoutTasksFromPI: mockBuildPostCheckoutTasksFromPI,
}));

vi.mock("@/modules/orders/constants/cache", async (importOriginal) => {
	// CACHE-AUDIT-002 : on garde le vrai getOrderInvalidationTags (pas de drift
	// sur les noms de tags user-scopés / détail).
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("@/modules/orders/constants/cache")>();
	return actual;
});

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
	getBaseUrl: vi.fn(() => "https://synclune.fr"),
	ROUTES: {
		ADMIN: {
			ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
			ORDERS: "/admin/ventes/commandes",
		},
		SHOP: {
			CHECKOUT: "/paiement",
		},
	},
}));

// Mock stripe to avoid API key requirement
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {},
}));

vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: mockEnsureInvoiceNumberPersisted,
}));

vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordSalesEReporting: mockRecordSalesEReporting,
}));

vi.mock("@/modules/payments/services/map-stripe-payment-method", () => ({
	extractPaymentMethodFromPaymentIntent: mockExtractPaymentMethod,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: vi.fn(),
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

	it("ORD-STRIPE-002: should call processOrderFromPaymentIntent even when metadata.checkoutSessionId is present", async () => {
		// Avant ORD-STRIPE-002, ce flow appelait markOrderAsPaid (sans décrément stock).
		// Un webhook payment_intent.succeeded arrivant avant checkout.session.completed
		// laissait l'order PAID + stock non décrémenté (guard checkout-order-processing.ts:114).
		mockProcessOrderFromPaymentIntent.mockResolvedValue({});
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);

		const pi = makePaymentIntent({
			metadata: { order_id: "order-1", checkoutSessionId: "cs_123" },
		});
		await handlePaymentSuccess(pi);

		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith("order-1", pi, undefined);
		expect(mockEnsureInvoiceNumberPersisted).toHaveBeenCalledWith("order-1");
		expect(mockRecordSalesEReporting).toHaveBeenCalledWith("order-1");
	});

	it("propagates the extracted payment_method to processOrderFromPaymentIntent (EINV-EREPORT-001)", async () => {
		mockProcessOrderFromPaymentIntent.mockResolvedValue({});
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);
		mockExtractPaymentMethod.mockResolvedValueOnce("SEPA_DEBIT");

		const pi = makePaymentIntent({
			metadata: { order_id: "order-1", checkoutSessionId: "cs_123" },
		});
		await handlePaymentSuccess(pi);

		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith("order-1", pi, "SEPA_DEBIT");
	});

	it("should warn and skip when no orderId in metadata", async () => {
		mockPrisma.order.findFirst.mockResolvedValueOnce(null);
		const result = await handlePaymentSuccess(makePaymentIntent({ metadata: {} }));

		expect(mockProcessOrderFromPaymentIntent).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("payment_intent.succeeded without orderId"),
			expect.objectContaining({ service: "webhook" }),
		);
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
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [], userId: "user-1" });
		mockMarkOrderAsFailed.mockResolvedValue(undefined);
	});

	it("should skip gracefully when no order_id in metadata", async () => {
		const result = await handlePaymentFailure(makePaymentIntent({ metadata: {} }));

		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("payment_intent.payment_failed without orderId"),
			expect.objectContaining({ service: "webhook" }),
		);
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
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

	/**
	 * @regression biz-bug-004
	 * Parité avec le flux async : un échec de paiement PI doit notifier le client
	 * (email PAYMENT_FAILED_EMAIL) quand l'email de la commande est connu.
	 */
	it("[regression biz-bug-004] emits PAYMENT_FAILED_EMAIL task when order has a customer email", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-2026-00042",
			customerEmail: "client@example.com",
			customerName: "Camille",
		});

		const result = await handlePaymentFailure(makePaymentIntent());

		const emailTask = result.tasks?.find((t) => t.type === "PAYMENT_FAILED_EMAIL");
		expect(emailTask).toBeDefined();
		if (emailTask?.type !== "PAYMENT_FAILED_EMAIL") throw new Error("type guard");
		expect(emailTask.data).toMatchObject({
			to: "client@example.com",
			customerName: "Camille",
			orderNumber: "SYN-2026-00042",
			retryUrl: "https://synclune.fr/paiement",
			idempotencyKey: "payment-failed-order-1",
		});
	});

	/**
	 * @regression biz-bug-004
	 * Aucun email si la commande n'a pas d'email (rien à notifier) — pas de crash.
	 */
	it("[regression biz-bug-004] skips PAYMENT_FAILED_EMAIL when order has no email", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-2026-00042",
			customerEmail: null,
			customerName: "Camille",
		});

		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result.tasks?.find((t) => t.type === "PAYMENT_FAILED_EMAIL")).toBeUndefined();
	});

	it("should include restored SKU ids in cache tags", async () => {
		mockRestoreStockForOrder.mockResolvedValue({
			restoredSkuIds: ["sku-1", "sku-2"],
			userId: "user-1",
		});

		const result = await handlePaymentFailure(makePaymentIntent());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("sku-stock-sku-1");
			expect(cacheTask.tags).toContain("sku-stock-sku-2");
		}
	});

	// CACHE-AUDIT-002 : l'espace client + le détail commande doivent refléter
	// CANCELLED immédiatement, pas après expiration du profil `user`.
	it("should invalidate user-scoped + order-detail tags via getOrderInvalidationTags", async () => {
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [], userId: "user-1" });

		const result = await handlePaymentFailure(makePaymentIntent());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask?.type).toBe("INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("order-detail-order-1");
			expect(cacheTask.tags).toContain("orders-user-user-1");
			expect(cacheTask.tags).toContain("last-order-user-user-1");
		}
	});
});

// ============================================================================
// handlePaymentCanceled
// ============================================================================

describe("handlePaymentCanceled", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [], userId: "user-1" });
		mockMarkOrderAsCancelled.mockResolvedValue(undefined);
	});

	it("should skip gracefully when no order_id in metadata", async () => {
		const result = await handlePaymentCanceled(makePaymentIntent({ metadata: {} }));

		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("payment_intent.canceled without orderId"),
			expect.objectContaining({ service: "webhook" }),
		);
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
		expect(mockMarkOrderAsCancelled).not.toHaveBeenCalled();
	});

	it("should call restoreStockForOrder and markOrderAsCancelled", async () => {
		await handlePaymentCanceled(makePaymentIntent());

		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-1");
		expect(mockMarkOrderAsCancelled).toHaveBeenCalledWith("order-1", "pi_123");
	});

	it("should initiate auto refund when status is canceled and amount_received > 0", async () => {
		mockInitiateAutomaticRefund.mockResolvedValue({ success: true });

		await handlePaymentCanceled(makePaymentIntent({ status: "canceled", amount_received: 5000 }));

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

		await handlePaymentCanceled(makePaymentIntent({ status: "canceled", amount_received: 5000 }));

		expect(mockSendRefundFailureAlert).toHaveBeenCalledWith(
			"order-1",
			"pi_123",
			"payment_canceled",
			"Refund error",
		);
	});

	it("should not refund when amount_received is 0 even if status is canceled", async () => {
		await handlePaymentCanceled(makePaymentIntent({ status: "canceled", amount_received: 0 }));

		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
	});

	it("should not refund when status is not canceled even if amount > 0", async () => {
		await handlePaymentCanceled(
			makePaymentIntent({ status: "requires_payment_method", amount_received: 5000 }),
		);

		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
	});

	it("should include restored SKU ids in cache tags", async () => {
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: ["sku-3"], userId: "user-1" });

		const result = await handlePaymentCanceled(makePaymentIntent());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("sku-stock-sku-3");
		}
	});

	// CACHE-AUDIT-002 : idem handlePaymentFailure.
	it("should invalidate user-scoped + order-detail tags via getOrderInvalidationTags", async () => {
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [], userId: "user-1" });

		const result = await handlePaymentCanceled(makePaymentIntent());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask?.type).toBe("INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("order-detail-order-1");
			expect(cacheTask.tags).toContain("orders-user-user-1");
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
		const result = await handleInvoicePaymentFailed(makeInvoice({ metadata: {} }));

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
