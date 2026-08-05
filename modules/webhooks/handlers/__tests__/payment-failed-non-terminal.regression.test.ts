/**
 * @regression payment-failed-non-terminal (audit webhooks 2026-07-02, F1/F2)
 *
 * Lock-in : `payment_intent.payment_failed` est NON-terminal et `handlePaymentFailure`
 * ne doit JAMAIS muter l'état de la commande ni déclencher d'effets terminaux.
 *
 * Bugs verrouillés :
 *  - F1 (hors-ordre) : un payment_failed d'une tentative antérieure livré APRÈS
 *    `payment_intent.succeeded` restockait une commande PAYÉE (restoreStockForOrder
 *    restaure sur paymentStatus=PAID) et la rétrogradait PAID→FAILED/CANCELLED
 *    sans refund (amount_received=0 dans le snapshot stale) — client débité,
 *    commande annulée, discount libéré à tort.
 *  - F2 (refus puis retry même PI) : le webhook annulait la commande PENDING en
 *    secondes ; le client corrigeant sa carte re-soumettait le MÊME PI
 *    (confirmCheckout idempotent par stripePaymentIntentId) → succeeded sur
 *    commande CANCELLED → detectCancelledOrderRace → débit puis auto-refund,
 *    commande perdue.
 *
 * Contrat verrouillé : observabilité seule — persistance des détails d'échec via
 * un updateMany conditionnel `paymentStatus: "PENDING"` (race-safe), zéro
 * transition, zéro restock, zéro refund, zéro email client. Le fail est acté par
 * le cron `sync-async-payments` (> 1h) ou par `payment_intent.canceled`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockOrderFindFirst,
	mockOrderUpdateMany,
	mockMarkOrderAsFailed,
	mockRestoreStockForOrder,
	mockInitiateAutomaticRefund,
	mockLogger,
} = vi.hoisted(() => ({
	mockOrderFindFirst: vi.fn(),
	mockOrderUpdateMany: vi.fn().mockResolvedValue({ count: 1 }),
	mockMarkOrderAsFailed: vi.fn().mockResolvedValue({ transitioned: true }),
	mockRestoreStockForOrder: vi.fn().mockResolvedValue({ restoredSkuIds: [], userId: null }),
	mockInitiateAutomaticRefund: vi.fn().mockResolvedValue({ success: true }),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findFirst: mockOrderFindFirst, updateMany: mockOrderUpdateMany } },
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("../../services/payment-intent.service", () => ({
	extractPaymentFailureDetails: vi.fn().mockReturnValue({
		code: "card_declined",
		declineCode: "insufficient_funds",
		message: "Your card was declined.",
	}),
	restoreStockForOrder: mockRestoreStockForOrder,
	markOrderAsFailed: mockMarkOrderAsFailed,
	markOrderAsCancelled: vi.fn(),
	initiateAutomaticRefund: mockInitiateAutomaticRefund,
	sendRefundFailureAlert: vi.fn(),
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
	extractPaymentDetailsFromPaymentIntent: vi
		.fn()
		.mockResolvedValue({ method: null, capturedAt: null }),
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminOrderProcessingFailedAlert: vi.fn(),
	sendWebhookFailedAlertEmail: vi.fn(),
}));

vi.mock("../../utils/capture-webhook-error", () => ({
	captureWebhookError: vi.fn(),
}));

import type Stripe from "stripe";
import { handlePaymentFailure } from "../payment-handlers";

function makePaymentIntent(overrides: Record<string, unknown> = {}) {
	return {
		id: "pi_nonterminal",
		status: "requires_payment_method",
		metadata: { orderId: "order-nt" },
		// F1 : le snapshot stale d'une tentative échouée porte toujours 0 même si
		// une tentative ultérieure du même PI a encaissé.
		amount_received: 0,
		...overrides,
	} as unknown as Stripe.PaymentIntent;
}

describe("[regression] payment_failed non-terminal — F1 stale after succeeded", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOrderUpdateMany.mockResolvedValue({ count: 1 });
	});

	it("PAID order → skip TOTAL : ni restock, ni transition, ni refund, ni email, warn loggé", async () => {
		mockOrderFindFirst.mockResolvedValue({
			orderNumber: "SYN-PAID",
			paymentStatus: "PAID",
		});

		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result).toEqual({ success: true, skipped: true, reason: "stale_payment_failed" });
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
		expect(mockOrderUpdateMany).not.toHaveBeenCalled();
		expect(result.tasks).toBeUndefined();
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Stale payment_failed"),
			expect.objectContaining({ service: "webhook", orderId: "order-nt" }),
		);
	});

	it("REFUNDED / PARTIALLY_REFUNDED → même skip stale (jamais de rétrogradation)", async () => {
		for (const paymentStatus of ["REFUNDED", "PARTIALLY_REFUNDED"]) {
			mockOrderFindFirst.mockResolvedValue({
				orderNumber: "SYN-REF",
				paymentStatus,
			});

			const result = await handlePaymentFailure(makePaymentIntent());

			expect(result).toEqual({ success: true, skipped: true, reason: "stale_payment_failed" });
		}
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
	});
});

describe("[regression] payment_failed non-terminal — F2 refus puis retry même PI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOrderUpdateMany.mockResolvedValue({ count: 1 });
		mockOrderFindFirst.mockResolvedValue({
			orderNumber: "SYN-PENDING",
			paymentStatus: "PENDING",
		});
	});

	it("PENDING order → AUCUNE transition (la commande reste re-payable sur le même PI)", async () => {
		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result.success).toBe(true);
		expect(result.skipped).toBeUndefined();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
	});

	// @regression payment-failed-writes-nothing (2026-08-04) : les 3 colonnes
	// `Order.paymentFailure*` ont été retirées (aucun lecteur ; le motif de refus
	// vit dans le log, dans `OrderHistory.metadata` côté chemin TERMINAL, et au
	// dashboard Stripe qui en reste la source autoritaire). Ce handler est
	// désormais purement observationnel : il ne DOIT plus écrire du tout — sinon
	// on rouvre une écriture en base à chaque nouvelle tentative de carte.
	it("n'écrit RIEN en base (handler purement observationnel)", async () => {
		await handlePaymentFailure(makePaymentIntent());

		expect(mockOrderUpdateMany).not.toHaveBeenCalled();
	});

	it("n'émet AUCUNE tâche PAYMENT_FAILED_EMAIL (le cron sync-async-payments est l'unique émetteur)", async () => {
		const result = await handlePaymentFailure(makePaymentIntent());

		// Le task type PAYMENT_FAILED_EMAIL a été supprimé de l'union (jamais
		// enqueued) — comparaison élargie pour garder l'assertion runtime.
		expect(
			result.tasks?.find((t) => (t.type as string) === "PAYMENT_FAILED_EMAIL"),
		).toBeUndefined();
		// Plus AUCUNE tâche : rien n'ayant changé en base, invalider le cache
		// serait un réveil Neon gratuit à chaque retry de carte.
		expect(result.tasks).toBeUndefined();
	});

	it("FAILED (le cron a déjà acté) → skip idempotent sans écriture", async () => {
		mockOrderFindFirst.mockResolvedValue({
			orderNumber: "SYN-FAILED",
			paymentStatus: "FAILED",
		});

		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result).toEqual({ success: true, skipped: true, reason: "already_failed" });
		expect(mockOrderUpdateMany).not.toHaveBeenCalled();
	});

	it("commande introuvable → skip sans throw", async () => {
		mockOrderFindFirst.mockResolvedValue(null);

		const result = await handlePaymentFailure(makePaymentIntent());

		expect(result).toEqual({ success: true, skipped: true, reason: "order_not_found" });
		expect(mockOrderUpdateMany).not.toHaveBeenCalled();
	});
});
