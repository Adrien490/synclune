/**
 * @regression amount-mismatch-auto-refund
 *
 * Garde : si la garde post-paiement du webhook trouve que Stripe a encaissé
 * MOINS que `order.total` (sous-facturation), la commande est remboursée
 * automatiquement et marquée FAILED — jamais PAID — et le webhook renvoie 200
 * pour stopper les retries Stripe.
 *
 * Bug d'origine (audit P2-1, 2026-05-30) : `processOrderAtomically` levait un
 * `Error` générique sur `amount_received < order.total`. `handlePaymentSuccess`
 * rethrow-ait → Stripe retriait à l'infini (~3 j) une commande jamais PAID,
 * laissant le client débité du montant minoré SANS remboursement automatique
 * (contrairement au chemin OversellError). On lève désormais `AmountMismatchError`
 * traité comme l'oversell : refund auto + FAILED + alerte admin + 200.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const {
	markOrderAsFailedMock,
	initiateAutomaticRefundMock,
	sendRefundFailureAlertMock,
	processOrderFromPaymentIntentMock,
	sendAdminOrderProcessingFailedAlertMock,
	ensureInvoiceNumberPersistedMock,
	recordSalesEReportingMock,
} = vi.hoisted(() => ({
	markOrderAsFailedMock: vi.fn(),
	initiateAutomaticRefundMock: vi.fn(),
	sendRefundFailureAlertMock: vi.fn(),
	processOrderFromPaymentIntentMock: vi.fn(),
	sendAdminOrderProcessingFailedAlertMock: vi.fn(),
	ensureInvoiceNumberPersistedMock: vi.fn(),
	recordSalesEReportingMock: vi.fn(),
}));

vi.mock("../../services/payment-intent.service", () => ({
	markOrderAsFailed: markOrderAsFailedMock,
	initiateAutomaticRefund: initiateAutomaticRefundMock,
	sendRefundFailureAlert: sendRefundFailureAlertMock,
	extractPaymentFailureDetails: vi.fn(),
	restoreStockForOrder: vi.fn(),
	markOrderAsCancelled: vi.fn(),
}));

vi.mock("../../services/checkout.service", () => ({
	processOrderFromPaymentIntent: processOrderFromPaymentIntentMock,
	buildPostCheckoutTasksFromPI: vi.fn(() => []),
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: sendAdminOrderProcessingFailedAlertMock,
	sendWebhookFailedAlertEmail: vi.fn(),
}));

vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: ensureInvoiceNumberPersistedMock,
}));

vi.mock("@/modules/invoices/services/defer-ereporting-retry.service", () => ({
	recordSalesEReportingDeferrable: recordSalesEReportingMock,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			findFirst: vi.fn().mockResolvedValue({
				orderNumber: "ORD-TEST-001",
				customerEmail: "test@example.com",
				total: 5000,
				userId: "user-1",
			}),
		},
	},
	notDeleted: {},
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: vi.fn(() => ["order-tag"]),
	ORDERS_CACHE_TAGS: { LIST: "orders-list" },
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { SKU_STOCK: (id: string) => `sku-stock-${id}` },
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges", ADMIN_ORDERS_LIST: "admin-orders-list" },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../utils/capture-webhook-error", () => ({
	captureWebhookError: vi.fn(),
}));

vi.mock("@/modules/payments/services/map-stripe-payment-method", () => ({
	extractPaymentMethodFromPaymentIntent: vi.fn(() => "CARD"),
}));

import { handlePaymentSuccess } from "../payment-handlers";
import { AmountMismatchError } from "../../services/checkout-order-processing.service";

function makePaymentIntent(overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
	return {
		id: "pi_test_123",
		object: "payment_intent",
		amount: 4000,
		amount_received: 4000,
		currency: "eur",
		status: "succeeded",
		metadata: { orderId: "order-1" },
		...overrides,
	} as Stripe.PaymentIntent;
}

describe("@regression amount-mismatch-auto-refund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		initiateAutomaticRefundMock.mockResolvedValue({ success: true });
	});

	it("auto-refunds and marks FAILED (never PAID) when processOrderFromPaymentIntent throws AmountMismatchError", async () => {
		// Stripe a encaissé 4000 pour une commande à 5000 → sous-facturation.
		processOrderFromPaymentIntentMock.mockRejectedValue(
			new AmountMismatchError("order-1", 5000, 4000),
		);

		const result = await handlePaymentSuccess(makePaymentIntent());

		// Remboursement automatique du montant encaissé
		expect(initiateAutomaticRefundMock).toHaveBeenCalledWith(
			"pi_test_123",
			"order-1",
			expect.stringContaining("Sous-facturation"),
		);
		// Commande marquée FAILED (jamais PAID)
		expect(markOrderAsFailedMock).toHaveBeenCalledWith(
			"order-1",
			"pi_test_123",
			expect.objectContaining({ code: "amount_mismatch" }),
		);
		// Aucune facture émise / aucune vente e-reporting enregistrée
		expect(ensureInvoiceNumberPersistedMock).not.toHaveBeenCalled();
		expect(recordSalesEReportingMock).not.toHaveBeenCalled();
		// Alerte admin actionnable
		expect(sendAdminOrderProcessingFailedAlertMock).toHaveBeenCalledWith(
			expect.objectContaining({ paymentIntentId: "pi_test_123" }),
		);
		// 200 pour stopper les retries (pas de throw)
		expect(result).toEqual({
			success: true,
			tasks: [{ type: "INVALIDATE_CACHE", tags: ["order-tag"] }],
		});
	});

	it("alerts admin when the auto-refund itself fails", async () => {
		processOrderFromPaymentIntentMock.mockRejectedValue(
			new AmountMismatchError("order-1", 5000, 4000),
		);
		initiateAutomaticRefundMock.mockResolvedValue({
			success: false,
			error: new Error("Stripe down"),
		});

		const result = await handlePaymentSuccess(makePaymentIntent());

		expect(sendRefundFailureAlertMock).toHaveBeenCalledWith(
			"order-1",
			"pi_test_123",
			"other",
			"Stripe down",
		);
		// Toujours 200 — l'incident est consigné, le retry Stripe ne corrigera rien.
		expect(result).toEqual({
			success: true,
			tasks: [{ type: "INVALIDATE_CACHE", tags: ["order-tag"] }],
		});
	});
});
