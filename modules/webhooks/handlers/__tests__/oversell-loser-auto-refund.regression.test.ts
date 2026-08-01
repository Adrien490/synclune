/**
 * @regression ord-stripe-009
 *
 * Bug : le perdant d'une race de stock sur le dernier exemplaire passe la vérif
 * optimiste de `createOrderInTransaction` (aucun décrément), confirme son paiement
 * Stripe, puis échoue la re-validation FOR UPDATE au webhook (`OversellError`). Le
 * code initial faisait `rethrow` → 500 → retry Stripe infini, SANS rembourser ni
 * annuler : le client était débité sans commande ni stock, et le code promo attaché
 * restait consommé (`Discount.usageCount` gonflé).
 *
 * Fix : `handlePaymentSuccess` catch `OversellError` → `markOrderAsFailed` (libère
 * le discount) + `initiateAutomaticRefund` (idempotent) + alerte admin + 200.
 *
 * Garde-fou : `processOrderFromPaymentIntent` doit rejeter avec une VRAIE instance
 * d'`OversellError` (subclass réelle, pas un `Object.assign(new Error, {...})`),
 * sinon le `instanceof OversellError` du handler ne matche pas et le test passe
 * "green for the wrong reason" via le catch générique (cf. webhooks-audit-2026-05-17).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockMarkOrderAsFailed,
	mockInitiateAutomaticRefund,
	mockSendRefundFailureAlert,
	mockProcessOrderFromPaymentIntent,
	mockBuildPostCheckoutTasksFromPI,
	mockEnsureInvoiceNumberPersisted,
	mockExtractPaymentMethod,
	mockSendAdminOrderProcessingFailedAlert,
	mockLogger,
	OversellError,
	CancelledOrderRaceError,
	AmountMismatchError,
} = vi.hoisted(() => {
	// Vraies subclasses — `instanceof` doit résoudre truthy dans le handler.
	class OversellError extends Error {
		constructor(
			public readonly orderId: string,
			public readonly skuId: string,
			public readonly reason: string,
		) {
			super(`Oversell on order ${orderId}: ${reason} (SKU: ${skuId})`);
			this.name = "OversellError";
		}
	}
	class CancelledOrderRaceError extends Error {
		constructor(public readonly orderId: string) {
			super(`Order ${orderId} cancelled`);
			this.name = "CancelledOrderRaceError";
		}
	}
	class AmountMismatchError extends Error {
		constructor(
			public readonly orderId: string,
			public readonly expectedTotal: number,
			public readonly amountReceived: number,
		) {
			super(`Amount mismatch on order ${orderId}`);
			this.name = "AmountMismatchError";
		}
	}
	return {
		mockPrisma: { order: { findFirst: vi.fn() } },
		mockMarkOrderAsFailed: vi.fn(),
		mockInitiateAutomaticRefund: vi.fn(),
		mockSendRefundFailureAlert: vi.fn(),
		mockProcessOrderFromPaymentIntent: vi.fn(),
		mockBuildPostCheckoutTasksFromPI: vi.fn(),
		mockEnsureInvoiceNumberPersisted: vi.fn().mockResolvedValue(undefined),
		mockExtractPaymentMethod: vi.fn().mockResolvedValue(null),
		mockSendAdminOrderProcessingFailedAlert: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		OversellError,
		CancelledOrderRaceError,
		AmountMismatchError,
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../services/payment-intent.service", () => ({
	extractPaymentFailureDetails: vi.fn(),
	restoreStockForOrder: vi.fn(),
	markOrderAsFailed: mockMarkOrderAsFailed,
	markOrderAsCancelled: vi.fn(),
	initiateAutomaticRefund: mockInitiateAutomaticRefund,
	sendRefundFailureAlert: mockSendRefundFailureAlert,
}));
vi.mock("../../services/checkout.service", () => ({
	processOrderFromPaymentIntent: mockProcessOrderFromPaymentIntent,
	buildPostCheckoutTasksFromPI: mockBuildPostCheckoutTasksFromPI,
}));
// Subclasses réelles partagées avec le handler (instanceof).
vi.mock("../../services/checkout-order-processing.service", () => ({
	OversellError,
	CancelledOrderRaceError,
	AmountMismatchError,
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
	PRODUCTS_CACHE_TAGS: { SKU_STOCK: (id: string) => `sku-stock-${id}` },
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn(),
	getBaseUrl: vi.fn(() => "https://synclune.fr"),
	ROUTES: {
		ADMIN: { ORDER_DETAIL: (id: string) => `/admin/ventes/commandes/${id}`, ORDERS: "/admin" },
		// `SHOP.ORDER_TRACKING` : le lien client des emails passe par
		// `buildOrderTrackingUrl` depuis le retrait de l'espace client (2026-07-31).
		SHOP: {
			ORDER_TRACKING: "/suivi-commande",
			CHECKOUT: "/paiement",
		},
	},
}));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: mockEnsureInvoiceNumberPersisted,
}));
vi.mock("@/modules/payments/services/map-stripe-payment-method", () => ({
	extractPaymentMethodFromPaymentIntent: mockExtractPaymentMethod,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: mockSendAdminOrderProcessingFailedAlert,
}));

import type Stripe from "stripe";
import { handlePaymentSuccess } from "../payment-handlers";

function makePaymentIntent(overrides: Record<string, unknown> = {}) {
	return {
		id: "pi_oversell",
		status: "succeeded",
		metadata: { orderId: "order-loser" },
		amount_received: 5000,
		...overrides,
	} as unknown as Stripe.PaymentIntent;
}

describe("[regression ord-stripe-009] oversell loser auto-refund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMarkOrderAsFailed.mockResolvedValue(undefined);
		mockInitiateAutomaticRefund.mockResolvedValue({ success: true, refundId: "re_1" });
		mockProcessOrderFromPaymentIntent.mockRejectedValue(
			new OversellError("order-loser", "sku-1", "invalid (active=true, stock=0, deleted=false)"),
		);
		mockPrisma.order.findFirst.mockResolvedValue({
			orderNumber: "SYN-2026-00099",
			customerEmail: "loser@example.com",
			total: 5000,
			userId: "user-loser",
		});
	});

	it("marks the order FAILED (releases discount), auto-refunds, and returns 200 (no rethrow)", async () => {
		const pi = makePaymentIntent();

		const result = await handlePaymentSuccess(pi);

		// markOrderAsFailed libère le discount + passe CANCELLED/FAILED
		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith(
			"order-loser",
			"pi_oversell",
			expect.objectContaining({ code: "oversell" }),
		);
		// remboursement automatique idempotent
		expect(mockInitiateAutomaticRefund).toHaveBeenCalledWith(
			"pi_oversell",
			"order-loser",
			expect.stringContaining("Oversell"),
			5000,
		);
		// pas de rethrow → 200 avec invalidation cache
		expect(result.success).toBe(true);
		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask?.type).toBe("INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("order-detail-order-loser");
			// Plus de tag user-scopé (retrait de l'espace client 2026-07-31).
			expect(cacheTask.tags.some((t: string) => t.startsWith("orders-user-"))).toBe(false);
		}
	});

	it("alerts admin with a manual-intervention message when the auto-refund itself fails", async () => {
		mockInitiateAutomaticRefund.mockResolvedValue({
			success: false,
			error: new Error("Stripe refund API down"),
		});

		const result = await handlePaymentSuccess(makePaymentIntent());

		expect(mockSendRefundFailureAlert).toHaveBeenCalledWith(
			"order-loser",
			"pi_oversell",
			"other",
			"Stripe refund API down",
		);
		expect(mockSendAdminOrderProcessingFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				orderNumber: "SYN-2026-00099",
				errorMessage: expect.stringContaining("ÉCHOUÉ"),
			}),
		);
		// Toujours 200 — le retry Stripe ne rétablirait pas le stock.
		expect(result.success).toBe(true);
	});

	it("does NOT auto-refund a generic (transient) processing error — rethrows for Stripe retry", async () => {
		mockProcessOrderFromPaymentIntent.mockRejectedValue(new Error("DB connection lost"));

		await expect(handlePaymentSuccess(makePaymentIntent())).rejects.toThrow("DB connection lost");

		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
	});

	it("returns SKIPPED (no rethrow) when a late PI succeeds on an already-cancelled order", async () => {
		mockProcessOrderFromPaymentIntent.mockRejectedValue(new CancelledOrderRaceError("order-loser"));

		const result = await handlePaymentSuccess(makePaymentIntent());

		// detectCancelledOrderRace a déjà initié le refund — on ne re-rembourse pas ici.
		expect(result).toEqual({ success: true, skipped: true, reason: "cancelled_order_race" });
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
	});
});
