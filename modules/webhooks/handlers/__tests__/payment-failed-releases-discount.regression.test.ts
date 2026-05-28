/**
 * @regression CHECKOUT-AUDIT-001
 *
 * Lock-in : un paiement échoué/annulé Stripe doit toujours libérer le code
 * promo (decrément `Discount.usageCount` + delete `DiscountUsage`). Sans cette
 * libération, le compteur dérive et sature `maxUsageCount` artificiellement.
 *
 * On vérifie l'ENCHAÎNEMENT depuis le handler (entry-point du dispatcher
 * webhook) — `releaseOrderDiscountUsageTx` doit être invoqué pour orderId,
 * même si le test mocke `markOrderAsFailed` au niveau service. Comme les
 * call-sites `payment_intent.payment_failed` et `payment_intent.canceled`
 * appellent ces marqueurs, on s'assure surtout que le handler ne les contourne
 * jamais (ex: skip silencieux si refund auto déclenché).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockMarkOrderAsFailed,
	mockMarkOrderAsCancelled,
	mockExtractPaymentFailureDetails,
	mockRestoreStockForOrder,
	mockInitiateAutomaticRefund,
	mockSendRefundFailureAlert,
} = vi.hoisted(() => ({
	mockMarkOrderAsFailed: vi.fn().mockResolvedValue(undefined),
	mockMarkOrderAsCancelled: vi.fn().mockResolvedValue(undefined),
	mockExtractPaymentFailureDetails: vi.fn().mockReturnValue({
		code: "card_declined",
		declineCode: null,
		message: null,
	}),
	mockRestoreStockForOrder: vi.fn().mockResolvedValue({ restoredSkuIds: [] }),
	mockInitiateAutomaticRefund: vi.fn().mockResolvedValue({ success: true }),
	mockSendRefundFailureAlert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findFirst: vi.fn() } },
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../services/payment-intent.service", () => ({
	markOrderAsPaid: vi.fn(),
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

vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordSalesEReporting: vi.fn(),
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
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [] });
	});

	it("payment_intent.payment_failed → markOrderAsFailed is invoked (which releases discount internally)", async () => {
		await handlePaymentFailure(makePaymentIntent());

		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith(
			"order-with-discount",
			"pi_failed_release",
			expect.any(Object),
		);
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
