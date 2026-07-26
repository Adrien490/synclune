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
	mockExtractPaymentMethod,
	mockSendAdminOrderProcessingFailedAlert,
	mockSendWebhookFailedAlertEmail,
	mockRefundsCreate,
	mockCaptureWebhookError,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findFirst: vi.fn(), updateMany: vi.fn() },
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
	mockExtractPaymentMethod: vi.fn().mockResolvedValue(null),
	mockSendAdminOrderProcessingFailedAlert: vi.fn(),
	mockSendWebhookFailedAlertEmail: vi.fn(),
	mockRefundsCreate: vi.fn(),
	mockCaptureWebhookError: vi.fn(),
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
	stripe: { refunds: { create: mockRefundsCreate } },
}));

vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: mockEnsureInvoiceNumberPersisted,
}));

vi.mock("@/modules/payments/services/map-stripe-payment-method", () => ({
	extractPaymentMethodFromPaymentIntent: mockExtractPaymentMethod,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: mockSendAdminOrderProcessingFailedAlert,
	sendWebhookFailedAlertEmail: mockSendWebhookFailedAlertEmail,
}));

vi.mock("../../utils/capture-webhook-error", () => ({
	captureWebhookError: mockCaptureWebhookError,
}));

import type Stripe from "stripe";
import {
	handlePaymentSuccess,
	handlePaymentFailure,
	handlePaymentCanceled,
	handlePaymentProcessing,
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

	/**
	 * @regression overbilling-admin-alert-2026-05-29
	 * Audit F2 : une sur-facturation (Stripe encaisse plus que order.total) ne
	 * rembourse PAS automatiquement (un avoir auto créerait une transaction
	 * REFUND e-reporting fantôme, Invariant 9 CLAUDE.md) — elle émet une alerte
	 * admin ACTIONNABLE pour refund manuel + ajustement e-reporting.
	 */
	it("[F2] emits an actionable admin alert on overbilling without auto-refunding", async () => {
		mockProcessOrderFromPaymentIntent.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			total: 5000,
			items: [],
		});
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);

		// amount_received 6000 > total 5000 → sur-facturation de 1000c.
		await handlePaymentSuccess(makePaymentIntent({ amount_received: 6000 }));

		expect(mockSendAdminOrderProcessingFailedAlert).toHaveBeenCalledTimes(1);
		const alertArg = mockSendAdminOrderProcessingFailedAlert.mock.calls[0]![0];
		expect(alertArg).toMatchObject({ orderNumber: "SYN-001", paymentIntentId: "pi_123" });
		expect(alertArg.errorMessage).toContain("Sur-facturation");

		// AM-2 : le trop-perçu est persisté (boucle fermée), pas seulement alerté.
		// Le guard `overbilledAmountCents: null` rend l'écriture idempotente.
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			where: { id: "order-1", overbilledAmountCents: null },
			data: { overbilledAmountCents: 1000 },
		});
	});

	it("[F2] does NOT alert when captured amount equals order.total", async () => {
		mockProcessOrderFromPaymentIntent.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			total: 5000,
			items: [],
		});
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);

		await handlePaymentSuccess(makePaymentIntent({ amount_received: 5000 }));

		expect(mockSendAdminOrderProcessingFailedAlert).not.toHaveBeenCalled();
	});

	it("[P2.1] alerts (Sentry + admin email) and skips on an orphan charge with no resolvable order", async () => {
		mockPrisma.order.findFirst.mockResolvedValueOnce(null);
		mockRefundsCreate.mockResolvedValueOnce({ id: "re_orphan" });
		const result = await handlePaymentSuccess(
			makePaymentIntent({ metadata: {}, amount_received: 5000 }),
		);

		expect(mockProcessOrderFromPaymentIntent).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		// No silent warn anymore — orphan charge must be loud + actionable.
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.stringContaining("ORPHAN payment_intent.succeeded"),
			undefined,
			expect.objectContaining({ service: "webhook" }),
		);
		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledTimes(1);
		const alertArg = mockSendWebhookFailedAlertEmail.mock.calls[0]![0];
		expect(alertArg.eventType).toContain("orphan");
	});

	/**
	 * @regression orphan-charge-auto-refund-2026-05-30
	 * ORD-STRIPE-010 : un encaissement orphelin (PI succeeded sans commande
	 * résoluble) est remboursé AUTOMATIQUEMENT et idempotemment. Sûr pour
	 * l'e-reporting (Invariant 9) car aucune transaction SALES/REFUND n'existe
	 * sans commande. L'alerte admin reflète le succès du refund.
	 */
	it("[ORD-STRIPE-010] auto-refunds an orphan charge idempotently and reports it in the admin alert", async () => {
		mockPrisma.order.findFirst.mockResolvedValueOnce(null);
		mockRefundsCreate.mockResolvedValueOnce({ id: "re_orphan" });

		const result = await handlePaymentSuccess(
			makePaymentIntent({ id: "pi_orphan", metadata: {}, amount_received: 5000 }),
		);

		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
		expect(mockRefundsCreate).toHaveBeenCalledWith(
			expect.objectContaining({ payment_intent: "pi_orphan" }),
			expect.objectContaining({ idempotencyKey: "orphan-refund-pi_orphan" }),
		);
		const alertArg = mockSendWebhookFailedAlertEmail.mock.calls[0]![0];
		expect(alertArg.error).toContain("re_orphan");
	});

	it("[ORD-STRIPE-010] does NOT attempt a refund on an orphan charge with amount_received = 0", async () => {
		mockPrisma.order.findFirst.mockResolvedValueOnce(null);

		const result = await handlePaymentSuccess(
			makePaymentIntent({ metadata: {}, amount_received: 0 }),
		);

		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		expect(mockRefundsCreate).not.toHaveBeenCalled();
		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledTimes(1);
	});

	it("[ORD-STRIPE-010] still alerts (manual fallback) when the orphan auto-refund fails", async () => {
		mockPrisma.order.findFirst.mockResolvedValueOnce(null);
		mockRefundsCreate.mockRejectedValueOnce(new Error("Stripe down"));

		const result = await handlePaymentSuccess(
			makePaymentIntent({ metadata: {}, amount_received: 5000 }),
		);

		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledTimes(1);
		const alertArg = mockSendWebhookFailedAlertEmail.mock.calls[0]![0];
		expect(alertArg.error).toContain("MANUELLEMENT");
	});

	it("[F5] captures in Sentry when the orphan-charge admin alert itself fails", async () => {
		// L'alerte email est le seul déclencheur du refund manuel si l'auto-refund
		// a échoué — son échec ne doit pas rester confiné aux logs.
		mockPrisma.order.findFirst.mockResolvedValueOnce(null);
		mockRefundsCreate.mockResolvedValueOnce({ id: "re_orphan" });
		mockSendWebhookFailedAlertEmail.mockRejectedValueOnce(new Error("SMTP down"));

		const result = await handlePaymentSuccess(
			makePaymentIntent({ metadata: {}, amount_received: 5000 }),
		);

		expect(result).toEqual({ success: true, skipped: true, reason: "no_order_id" });
		expect(mockCaptureWebhookError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ handler: "handlePaymentSuccess.orphanAlert" }),
		);
	});

	it("[F5] captures in Sentry when persisting the overbilling delta fails", async () => {
		// Sans overbilledAmountCents persisté, reconcileOverbilledOrders ne verra
		// jamais le trop-perçu.
		mockProcessOrderFromPaymentIntent.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			total: 5000,
			items: [],
		});
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);
		mockPrisma.order.updateMany.mockRejectedValueOnce(new Error("DB down"));

		await handlePaymentSuccess(makePaymentIntent({ amount_received: 6000 }));

		expect(mockCaptureWebhookError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ handler: "handlePaymentSuccess.overbillingPersist" }),
		);
	});

	it("[F5] captures in Sentry when the overbilling admin alert fails", async () => {
		mockProcessOrderFromPaymentIntent.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			total: 5000,
			items: [],
		});
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);
		mockSendAdminOrderProcessingFailedAlert.mockRejectedValueOnce(new Error("SMTP down"));

		const result = await handlePaymentSuccess(makePaymentIntent({ amount_received: 6000 }));

		// Le flow n'est pas bloqué (le client a payé, la commande est honorée)…
		expect(result.success).toBe(true);
		// …mais l'échec d'alerte remonte dans Sentry.
		expect(mockCaptureWebhookError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ handler: "handlePaymentSuccess.overbillingAlert" }),
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
		// Commande PENDING nominale (le handler fetch l'état avant de décider).
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-2026-00042",
			paymentStatus: "PENDING",
			userId: "user-1",
		});
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
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

	// Audit webhooks 2026-07-02 (F1/F2) : payment_failed est NON-terminal — le PI
	// repasse requires_payment_method et le client peut retenter le même PI.
	// Aucune transition, aucun restock, aucun refund, aucun email : le fail est
	// acté par le cron sync-async-payments (> 1h) ou payment_intent.canceled.
	it("must NOT transition, restock, refund nor email the customer (non-terminal)", async () => {
		const result = await handlePaymentFailure(makePaymentIntent({ amount_received: 0 }));

		expect(result.success).toBe(true);
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
		// Le task type PAYMENT_FAILED_EMAIL a été supprimé de l'union (jamais
		// enqueued) — comparaison élargie pour garder l'assertion runtime.
		expect(
			result.tasks?.find((t) => (t.type as string) === "PAYMENT_FAILED_EMAIL"),
		).toBeUndefined();
	});

	it("persists failure details via a PENDING-conditional updateMany (race-safe, no transition)", async () => {
		await handlePaymentFailure(makePaymentIntent());

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			where: { id: "order-1", paymentStatus: "PENDING", deletedAt: null },
			data: {
				paymentFailureCode: "card_declined",
				paymentDeclineCode: "insufficient_funds",
				paymentFailureMessage: "Your card was declined.",
			},
		});
	});

	it("skips as stale when the order is already PAID (out-of-order delivery, F1)", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-2026-00042",
			paymentStatus: "PAID",
			userId: "user-1",
		});

		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result).toEqual({ success: true, skipped: true, reason: "stale_payment_failed" });
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Stale payment_failed"),
			expect.objectContaining({ service: "webhook" }),
		);
	});

	it("skips as stale when the order is REFUNDED or PARTIALLY_REFUNDED", async () => {
		for (const paymentStatus of ["REFUNDED", "PARTIALLY_REFUNDED"]) {
			mockPrisma.order.findFirst.mockResolvedValue({
				orderNumber: "SYN-2026-00042",
				paymentStatus,
				userId: "user-1",
			});

			const result = await handlePaymentFailure(makePaymentIntent());

			expect(result).toEqual({ success: true, skipped: true, reason: "stale_payment_failed" });
		}
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	it("skips idempotently when the order is already FAILED (cron already acted)", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-2026-00042",
			paymentStatus: "FAILED",
			userId: "user-1",
		});

		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result).toEqual({ success: true, skipped: true, reason: "already_failed" });
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	it("skips when the order is not found", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result).toEqual({ success: true, skipped: true, reason: "order_not_found" });
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	// CACHE-AUDIT-002 : l'espace client + le détail commande doivent refléter
	// les détails d'échec immédiatement, pas après expiration du profil `user`.
	it("should invalidate user-scoped + order-detail tags via getOrderInvalidationTags", async () => {
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
		// IDEM-CANCEL-002 : cancel + restock fusionnés — markOrderAsCancelled
		// porte désormais le résultat restock (restoredSkus, userId).
		mockMarkOrderAsCancelled.mockResolvedValue({ restoredSkus: [], userId: "user-1" });
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

	it("should call markOrderAsCancelled (cancel + restock fusionnés, IDEM-CANCEL-002)", async () => {
		await handlePaymentCanceled(makePaymentIntent());

		expect(mockMarkOrderAsCancelled).toHaveBeenCalledWith("order-1", "pi_123");
		// Le restock séparé (2 transactions) est supprimé : un crash entre les
		// deux commits permettait un double restock au retry cron.
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
	});

	it("should initiate auto refund when status is canceled and amount_received > 0", async () => {
		mockInitiateAutomaticRefund.mockResolvedValue({ success: true });

		await handlePaymentCanceled(makePaymentIntent({ status: "canceled", amount_received: 5000 }));

		expect(mockInitiateAutomaticRefund).toHaveBeenCalledWith(
			"pi_123",
			"order-1",
			"Payment canceled, automatic refund",
			5000,
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
		mockMarkOrderAsCancelled.mockResolvedValue({
			restoredSkus: [{ skuId: "sku-3" }],
			userId: "user-1",
		});

		const result = await handlePaymentCanceled(makePaymentIntent());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("sku-stock-sku-3");
		}
	});

	// CACHE-AUDIT-002 : idem handlePaymentFailure.
	it("should invalidate user-scoped + order-detail tags via getOrderInvalidationTags", async () => {
		mockMarkOrderAsCancelled.mockResolvedValue({ restoredSkus: [], userId: "user-1" });

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
// handlePaymentProcessing (F3)
// ============================================================================

describe("handlePaymentProcessing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("F3: should ack without mutating order state (skipped + reason)", async () => {
		const pi = makePaymentIntent({ status: "processing", metadata: { orderId: "order-1" } });

		const result = await handlePaymentProcessing(pi);

		expect(result).toEqual({ success: true, skipped: true, reason: "payment_processing" });
		// Aucune mutation : pas de fail/cancel/refund/process.
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockMarkOrderAsCancelled).not.toHaveBeenCalled();
		expect(mockProcessOrderFromPaymentIntent).not.toHaveBeenCalled();
		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("F3: should not throw when orderId is absent from metadata", async () => {
		const pi = makePaymentIntent({ status: "processing", metadata: {} });

		const result = await handlePaymentProcessing(pi);

		expect(result.success).toBe(true);
		expect(result.skipped).toBe(true);
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
