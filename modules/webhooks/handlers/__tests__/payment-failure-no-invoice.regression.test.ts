/**
 * @regression payment-failure-no-invoice
 *
 * Garantie Art. 289-I CGI (facturation à l'encaissement) :
 * Seul `payment_intent.succeeded` DOIT déclencher `ensureInvoiceNumberPersisted()`
 * et `recordSalesEReporting()`. Les events `payment_intent.payment_failed` et
 * `payment_intent.canceled` NE DOIVENT JAMAIS émettre de facture (sinon
 * F-YYYY-NNNNN gap-free explose + reporting comptable faussé).
 *
 * EINV-TEST-007 — sécurise le branchement contre tout refacto qui appellerait
 * les hooks invoicing depuis les mauvais handlers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
	mockLogger,
	mockProcessOrderFromPaymentIntent,
	mockBuildPostCheckoutTasksFromPI,
	mockEnsureInvoiceNumberPersisted,
	mockRecordSalesEReporting,
} = vi.hoisted(() => ({
	mockPrisma: { order: { findFirst: vi.fn() } },
	mockMarkOrderAsPaid: vi.fn(),
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
	mockEnsureInvoiceNumberPersisted: vi.fn(),
	mockRecordSalesEReporting: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("../../services/payment-intent.service", () => ({
	markOrderAsPaid: mockMarkOrderAsPaid,
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

vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: mockEnsureInvoiceNumberPersisted,
}));

vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordSalesEReporting: mockRecordSalesEReporting,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: vi.fn(),
}));

vi.mock("@/modules/orders/constants/cache", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("@/modules/orders/constants/cache")>();
	return actual;
});

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges", ADMIN_ORDERS_LIST: "admin-orders-list" },
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { SKU_STOCK: (skuId: string) => `sku-stock-${skuId}` },
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		ADMIN: {
			ORDER_DETAIL: (id: string) => `/admin/ventes/commandes/${id}`,
			ORDERS: "/admin/ventes/commandes",
		},
	},
}));

vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));

vi.mock("../../utils/capture-webhook-error", () => ({
	captureWebhookError: vi.fn(),
}));

import type Stripe from "stripe";
import {
	handlePaymentSuccess,
	handlePaymentFailure,
	handlePaymentCanceled,
} from "../payment-handlers";

function makePaymentIntent(overrides: Record<string, unknown> = {}) {
	return {
		id: "pi_test_123",
		status: "succeeded",
		metadata: { orderId: "order-1" },
		amount_received: 0,
		...overrides,
	} as unknown as Stripe.PaymentIntent;
}

describe("@regression payment-failure-no-invoice — EINV-TEST-007", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockExtractPaymentFailureDetails.mockReturnValue({
			code: "card_declined",
			declineCode: "insufficient_funds",
			message: "Your card was declined.",
		});
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [] });
		mockMarkOrderAsFailed.mockResolvedValue(undefined);
		mockMarkOrderAsCancelled.mockResolvedValue(undefined);
		mockMarkOrderAsPaid.mockResolvedValue(undefined);
		mockProcessOrderFromPaymentIntent.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-2026-0001",
		});
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);
		mockEnsureInvoiceNumberPersisted.mockResolvedValue(undefined);
		mockRecordSalesEReporting.mockResolvedValue({ status: "skipped", reason: "feature-flag-off" });
	});

	describe("payment_intent.payment_failed — INVARIANT no invoice", () => {
		it("ne déclenche PAS ensureInvoiceNumberPersisted", async () => {
			await handlePaymentFailure(makePaymentIntent());

			expect(mockEnsureInvoiceNumberPersisted).not.toHaveBeenCalled();
		});

		it("ne déclenche PAS recordSalesEReporting", async () => {
			await handlePaymentFailure(makePaymentIntent());

			expect(mockRecordSalesEReporting).not.toHaveBeenCalled();
		});

		it("ne déclenche AUCUN hook invoicing même si amount_received > 0 (refund auto attendu)", async () => {
			mockInitiateAutomaticRefund.mockResolvedValue({ success: true });

			await handlePaymentFailure(makePaymentIntent({ amount_received: 5000 }));

			expect(mockEnsureInvoiceNumberPersisted).not.toHaveBeenCalled();
			expect(mockRecordSalesEReporting).not.toHaveBeenCalled();
		});

		it("ne déclenche AUCUN hook invoicing même quand orderId est absent (skip path)", async () => {
			await handlePaymentFailure(makePaymentIntent({ metadata: {} }));

			expect(mockEnsureInvoiceNumberPersisted).not.toHaveBeenCalled();
			expect(mockRecordSalesEReporting).not.toHaveBeenCalled();
		});
	});

	describe("payment_intent.canceled — INVARIANT no invoice", () => {
		it("ne déclenche PAS ensureInvoiceNumberPersisted", async () => {
			await handlePaymentCanceled(makePaymentIntent({ status: "canceled" }));

			expect(mockEnsureInvoiceNumberPersisted).not.toHaveBeenCalled();
		});

		it("ne déclenche PAS recordSalesEReporting", async () => {
			await handlePaymentCanceled(makePaymentIntent({ status: "canceled" }));

			expect(mockRecordSalesEReporting).not.toHaveBeenCalled();
		});

		it("ne déclenche AUCUN hook invoicing même si amount_received > 0", async () => {
			mockInitiateAutomaticRefund.mockResolvedValue({ success: true });

			await handlePaymentCanceled(makePaymentIntent({ status: "canceled", amount_received: 4999 }));

			expect(mockEnsureInvoiceNumberPersisted).not.toHaveBeenCalled();
			expect(mockRecordSalesEReporting).not.toHaveBeenCalled();
		});
	});

	describe("CONTRÔLE — payment_intent.succeeded déclenche bien les deux hooks", () => {
		it("appelle ensureInvoiceNumberPersisted + recordSalesEReporting (new PI flow)", async () => {
			await handlePaymentSuccess(
				makePaymentIntent({ metadata: { orderId: "order-1" } /* pas de checkoutSessionId */ }),
			);

			expect(mockEnsureInvoiceNumberPersisted).toHaveBeenCalledWith("order-1");
			expect(mockRecordSalesEReporting).toHaveBeenCalledWith("order-1");
		});

		it("appelle ensureInvoiceNumberPersisted + recordSalesEReporting (old checkout session flow)", async () => {
			await handlePaymentSuccess(
				makePaymentIntent({
					metadata: { orderId: "order-1", checkoutSessionId: "cs_xyz" },
				}),
			);

			expect(mockEnsureInvoiceNumberPersisted).toHaveBeenCalledWith("order-1");
			expect(mockRecordSalesEReporting).toHaveBeenCalledWith("order-1");
		});
	});
});
