/**
 * @regression CHECKOUT-AUDIT-001
 *
 * Lock-in : un paiement TERMINALEMENT échoué doit toujours libérer le code
 * promo (decrément `Discount.usageCount` + delete `DiscountUsage`). Sans cette
 * libération, le compteur dérive et sature `maxUsageCount` artificiellement.
 *
 * Révision audit webhooks 2026-07-02 : `payment_intent.payment_failed` n'est
 * PLUS un chemin de libération — l'événement est non-terminal (le PI repasse
 * `requires_payment_method`, le client peut retenter le MÊME PI) et libérer le
 * discount à ce moment le rendait réutilisable pendant que la commande pouvait
 * encore aboutir (drift `usageCount` inverse). La libération est différée aux
 * chemins réellement terminaux :
 *  - cron `sync-async-payments` (PENDING + PI > 1h → markOrderAsFailed) ;
 *  - `payment_intent.canceled` → markOrderAsCancelled.
 * Ce test verrouille les DEUX sens : canceled libère toujours, payment_failed
 * ne libère plus (n'invoque plus markOrderAsFailed du tout).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockMarkOrderAsFailed,
	mockMarkOrderAsCancelled,
	mockExtractPaymentFailureDetails,
	mockRestoreStockForOrder,
	mockInitiateAutomaticRefund,
	mockSendRefundFailureAlert,
	mockOrderFindFirst,
	mockOrderUpdateMany,
} = vi.hoisted(() => ({
	mockMarkOrderAsFailed: vi.fn().mockResolvedValue({ transitioned: true }),
	mockMarkOrderAsCancelled: vi.fn().mockResolvedValue({ restoredSkus: [], userId: null }),
	mockExtractPaymentFailureDetails: vi.fn().mockReturnValue({
		code: "card_declined",
		declineCode: null,
		message: null,
	}),
	mockRestoreStockForOrder: vi.fn().mockResolvedValue({ restoredSkus: [] }),
	mockInitiateAutomaticRefund: vi.fn().mockResolvedValue({ success: true }),
	mockSendRefundFailureAlert: vi.fn().mockResolvedValue(undefined),
	mockOrderFindFirst: vi.fn(),
	mockOrderUpdateMany: vi.fn().mockResolvedValue({ count: 1 }),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findFirst: mockOrderFindFirst, updateMany: mockOrderUpdateMany } },
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../services/payment-intent.service", () => ({
	markOrderAsFailed: mockMarkOrderAsFailed,
	markOrderAsCancelled: mockMarkOrderAsCancelled,
	extractPaymentFailureDetails: mockExtractPaymentFailureDetails,
	restoreStockForOrder: mockRestoreStockForOrder,
	initiateAutomaticRefund: mockInitiateAutomaticRefund,
	sendRefundFailureAlert: mockSendRefundFailureAlert,
}));

vi.mock("../../services/checkout.service", () => ({
	processOrderFromPaymentIntent: vi.fn(),
	buildPostCheckoutTasksFromPI: vi.fn(),
}));

vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));

vi.mock("@/modules/orders/constants/cache", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("@/modules/orders/constants/cache")>();
	return actual;
});

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges", ADMIN_ORDERS_LIST: "admin-orders-list" },
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { SKU_STOCK: (id: string) => `sku-stock-${id}` },
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn(),
	ROUTES: { ADMIN: { ORDER_DETAIL: (id: string) => `/admin/${id}`, ORDERS: "/admin/orders" } },
}));

vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: vi.fn(),
}));


vi.mock("@/modules/payments/services/map-stripe-payment-method", () => ({
	extractPaymentMethodFromPaymentIntent: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: vi.fn(),
}));

import type Stripe from "stripe";
import { handlePaymentFailure, handlePaymentCanceled } from "../payment-handlers";

function makePaymentIntent(overrides: Record<string, unknown> = {}) {
	return {
		id: "pi_failed_release",
		status: "requires_payment_method",
		metadata: { orderId: "order-with-discount" },
		amount_received: 0,
		...overrides,
	} as unknown as Stripe.PaymentIntent;
}

describe("[regression] CHECKOUT-AUDIT-001 — discount released on payment_intent failure/cancel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockExtractPaymentFailureDetails.mockReturnValue({
			code: "card_declined",
			declineCode: null,
			message: null,
		});
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkus: [] });
		mockOrderFindFirst.mockResolvedValue({
			orderNumber: "SYN-001",
			paymentStatus: "PENDING",
			userId: null,
		});
		mockOrderUpdateMany.mockResolvedValue({ count: 1 });
	});

	it("payment_intent.payment_failed → must NOT invoke markOrderAsFailed (non-terminal, release deferred to cron/canceled — audit 2026-07-02)", async () => {
		const result = await handlePaymentFailure(makePaymentIntent());

		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(result.success).toBe(true);
	});

	it("payment_intent.canceled → markOrderAsCancelled is invoked (which releases discount internally)", async () => {
		await handlePaymentCanceled(
			makePaymentIntent({ id: "pi_canceled_release", status: "canceled", amount_received: 0 }),
		);

		expect(mockMarkOrderAsCancelled).toHaveBeenCalledWith(
			"order-with-discount",
			"pi_canceled_release",
		);
	});

	it("skips both markers when metadata.orderId is missing (no order = no discount to release)", async () => {
		await handlePaymentFailure(makePaymentIntent({ metadata: {} }));
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();

		await handlePaymentCanceled(makePaymentIntent({ metadata: {}, status: "canceled" }));
		expect(mockMarkOrderAsCancelled).not.toHaveBeenCalled();
	});
});
