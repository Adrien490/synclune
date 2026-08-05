import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidateTag } from "next/cache";

const {
	mockPrisma,
	mockStripe,
	mockGetStripeClient,
	mockProcessOrderFromPaymentIntent,
	mockEnsureInvoiceNumberPersisted,
	mockExtractPaymentDetailsFromPaymentIntent,
	mockMarkOrderAsFailed,
	mockExtractPaymentFailureDetails,
	mockRestoreStockForOrder,
	mockSendAdminCronFailedAlert,
	mockSendPaymentFailedEmail,
	mockBuildPostCheckoutTasksFromPI,
	mockExecutePostWebhookTasks,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockStripe: {
		paymentIntents: { retrieve: vi.fn(), cancel: vi.fn() },
	},
	mockGetStripeClient: vi.fn(),
	mockProcessOrderFromPaymentIntent: vi.fn(),
	mockEnsureInvoiceNumberPersisted: vi.fn(),
	mockExtractPaymentDetailsFromPaymentIntent: vi.fn(),
	mockMarkOrderAsFailed: vi.fn(),
	mockExtractPaymentFailureDetails: vi.fn(),
	mockRestoreStockForOrder: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
	mockSendPaymentFailedEmail: vi.fn(),
	mockBuildPostCheckoutTasksFromPI: vi.fn(),
	mockExecutePostWebhookTasks: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	getStripeClient: mockGetStripeClient,
}));

// Ce service s'execute en contexte route handler (cron/webhook) : il invalide via
// `revalidateTagsInBackground` -> `revalidateTag(tag, { expire: 0 })`, car
// `updateTag` y throw (E872). Les DEUX sont routes vers le meme espion : ce que
// ces tests verifient, c'est QUELS tags sont invalides. Le choix de l'API selon le
// contexte est prouve, lui, sans mock, par
// `test/contract/cache-invalidation-context.contract.test.ts`.
vi.mock("next/cache", () => ({
	updateTag: vi.fn(),
	revalidateTag: vi.fn(),
}));

vi.mock("@/modules/webhooks/services/payment-intent.service", () => ({
	markOrderAsFailed: mockMarkOrderAsFailed,
	extractPaymentFailureDetails: mockExtractPaymentFailureDetails,
	restoreStockForOrder: mockRestoreStockForOrder,
}));

vi.mock("@/modules/webhooks/services/checkout.service", () => ({
	processOrderFromPaymentIntent: mockProcessOrderFromPaymentIntent,
}));

vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: mockEnsureInvoiceNumberPersisted,
}));

vi.mock("@/modules/payments/services/map-stripe-payment-method", () => ({
	extractPaymentDetailsFromPaymentIntent: mockExtractPaymentDetailsFromPaymentIntent,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

vi.mock("@/modules/emails/services/payment-emails", () => ({
	sendPaymentFailedEmail: mockSendPaymentFailedEmail,
}));

// WEBHOOK-AUDIT-003 : la reprise d'un webhook perdu rejoue désormais les post-tasks
// du checkout (confirmation client) via ces deux services.
vi.mock("@/modules/webhooks/services/checkout-post-tasks.service", () => ({
	buildPostCheckoutTasksFromPI: mockBuildPostCheckoutTasksFromPI,
}));

vi.mock("@/modules/webhooks/services/execute-post-webhook-tasks.service", () => ({
	executePostWebhookTasks: mockExecutePostWebhookTasks,
}));

import { syncAsyncPayments } from "../sync-async-payments.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

describe("syncAsyncPayments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
		mockStripe.paymentIntents.cancel.mockResolvedValue({ status: "canceled" });
		mockMarkOrderAsFailed.mockResolvedValue({ transitioned: true });
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkus: [] });
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		mockProcessOrderFromPaymentIntent.mockResolvedValue(undefined);
		mockEnsureInvoiceNumberPersisted.mockResolvedValue(undefined);
		mockExtractPaymentDetailsFromPaymentIntent.mockResolvedValue({
			method: null,
			capturedAt: null,
		});
		mockSendPaymentFailedEmail.mockResolvedValue(undefined);
		mockBuildPostCheckoutTasksFromPI.mockReturnValue([]);
		mockExecutePostWebhookTasks.mockResolvedValue({ successful: 0, failed: 0 });
	});

	it("should return skipped result with STRIPE_KEY_MISSING reason when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await syncAsyncPayments();

		expect(result).toEqual({
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		});
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	it("should return zero counts when no pending orders exist", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await syncAsyncPayments();

		expect(result).toMatchObject({ checked: 0, updated: 0, errors: 0, hasMore: false });
	});

	it("F4: should query PENDING+PI orders older than 1h with NO upper age bound, oldest first", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await syncAsyncPayments();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where.paymentStatus).toBe("PENDING");
		expect(call.where.stripePaymentIntentId).toEqual({ not: null });
		expect(call.where.deletedAt).toBeNull();

		const minAge = new Date(Date.now() - THRESHOLDS.ASYNC_PAYMENT_MIN_AGE_MS);
		expect(call.where.createdAt.lt.getTime()).toBe(minAge.getTime());
		// F4 : la borne haute (10j) est retirée — un PI succeeded de tout âge doit
		// être réconcilié (débit orphelin sinon). On traite les plus anciens d'abord.
		expect(call.where.createdAt.gte).toBeUndefined();
		expect(call.orderBy).toEqual({ createdAt: "asc" });
	});

	it("should process order via the webhook path when Stripe shows succeeded", async () => {
		const order = {
			id: "order-1",
			orderNumber: "SYN-001",
			stripePaymentIntentId: "pi_success",
			paymentStatus: "PENDING",
		};
		const paymentIntent = { id: "pi_success", status: "succeeded" };
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntent);

		const result = await syncAsyncPayments();

		// ORD-STRIPE-001 : décrément stock garanti via processOrderFromPaymentIntent
		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith("order-1", paymentIntent, {
			method: null,
			capturedAt: null,
		});
		expect(mockEnsureInvoiceNumberPersisted).toHaveBeenCalledWith("order-1");
		expect(result!.updated).toBe(1);
		expect(result!.checked).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	// CACHE-AUDIT-004 : confirmation async → l'espace client doit refléter PAID
	// immédiatement (tags user-scopés + détail), pas après expiration du profil.
	it("CACHE-AUDIT-004: should invalidate order-detail tags on success, without user-scoped tags", async () => {
		const order = {
			id: "order-1",
			orderNumber: "SYN-001",
			stripePaymentIntentId: "pi_success",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ id: "pi_success", status: "succeeded" });

		await syncAsyncPayments();

		const invalidated = vi.mocked(revalidateTag).mock.calls.map((c) => c[0]);
		expect(invalidated).toContain("order-detail-order-1");
		// Plus de tag user-scopé (retrait de l'espace client 2026-07-31).
		expect(invalidated.some((t: string) => t.startsWith("orders-user-"))).toBe(false);
	});

	// WEBHOOK-AUDIT-003 — ce cron est le filet d'un webhook `payment_intent.succeeded`
	// définitivement perdu. Il rejouait le stock, la facture et l'e-reporting mais
	// N'ÉMETTAIT AUCUNE confirmation : le client était débité et servi sans jamais
	// recevoir d'email. On verrouille la reconstruction des post-tasks du checkout.
	describe("WEBHOOK-AUDIT-003 — confirmation de commande sur reprise de webhook perdu", () => {
		const succeededOrder = {
			id: "order-1",
			orderNumber: "SYN-001",
			stripePaymentIntentId: "pi_success",
			paymentStatus: "PENDING",
		};

		it("exécute en direct la task ORDER_CONFIRMATION_EMAIL construite depuis la commande traitée", async () => {
			const processedOrder = { id: "order-1", orderNumber: "SYN-001", items: [] };
			const paymentIntent = { id: "pi_success", status: "succeeded" };
			const emailTask = {
				type: "ORDER_CONFIRMATION_EMAIL",
				data: { to: "client@example.com", idempotencyKey: "order-confirm-order-1" },
			};
			mockPrisma.order.findMany.mockResolvedValue([succeededOrder]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntent);
			mockProcessOrderFromPaymentIntent.mockResolvedValue(processedOrder);
			mockBuildPostCheckoutTasksFromPI.mockReturnValue([emailTask]);

			await syncAsyncPayments();

			// Construit depuis la commande RETOURNÉE par le traitement (état post-PAID),
			// pas depuis le snapshot PENDING de la sélection.
			expect(mockBuildPostCheckoutTasksFromPI).toHaveBeenCalledWith(processedOrder, paymentIntent);
			// Lot 2 S3.4 : exécution DIRECTE — plus de file, la dédup est portée par
			// la clé d'idempotence Resend `order-confirm-<id>`.
			expect(mockExecutePostWebhookTasks).toHaveBeenCalledWith([emailTask]);
		});

		it("n'exécute pas de task INVALIDATE_CACHE — ses tags partent par le flush du cron", async () => {
			mockPrisma.order.findMany.mockResolvedValue([succeededOrder]);
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				id: "pi_success",
				status: "succeeded",
			});
			mockProcessOrderFromPaymentIntent.mockResolvedValue({ id: "order-1", items: [] });
			mockBuildPostCheckoutTasksFromPI.mockReturnValue([
				{ type: "INVALIDATE_CACHE", tags: ["product-bague-lune", "cart-user-9"] },
			]);

			await syncAsyncPayments();

			expect(mockExecutePostWebhookTasks).not.toHaveBeenCalled();
			// Les tags panier/stock que la boucle historique n'invalidait pas sont
			// désormais couverts.
			const invalidated = vi.mocked(revalidateTag).mock.calls.map((c) => c[0]);
			expect(invalidated).toContain("product-bague-lune");
			expect(invalidated).toContain("cart-user-9");
		});
	});

	// ORD-STRIPE-001 régression : si le webhook async_payment_succeeded est perdu,
	// le cron doit déclencher le même flow que le webhook (décrément stock inclus).
	it("ORD-STRIPE-001: should propagate the resolved paymentMethod to processOrderFromPaymentIntent", async () => {
		const order = {
			id: "order-card",
			orderNumber: "SYN-CARD",
			stripePaymentIntentId: "pi_card_success",
			paymentStatus: "PENDING",
		};
		const paymentIntent = { id: "pi_card_success", status: "succeeded" };
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntent);
		mockExtractPaymentDetailsFromPaymentIntent.mockResolvedValue({
			method: "CARD",
			capturedAt: null,
		});

		await syncAsyncPayments();

		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith("order-card", paymentIntent, {
			method: "CARD",
			capturedAt: null,
		});
	});

	/**
	 * @regression paid-at-from-stripe-capture-2026-08-05
	 *
	 * C'est le chemin où l'écart est le plus large : cette tâche est MANUELLE
	 * (page Maintenance), donc elle peut rattraper un paiement vieux de plusieurs
	 * jours. Poser l'horloge du run daterait la recette du jour du clic — faux
	 * dans le livre de recettes (Art. 50-0) comme sur le PDF de facture.
	 */
	it("propage la date de capture Stripe, pas l'heure du rattrapage manuel", async () => {
		const capturedAt = new Date("2025-12-31T23:59:59.000Z");
		const order = {
			id: "order-late",
			orderNumber: "SYN-LATE",
			stripePaymentIntentId: "pi_late",
			paymentStatus: "PENDING",
		};
		const paymentIntent = { id: "pi_late", status: "succeeded" };
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntent);
		mockExtractPaymentDetailsFromPaymentIntent.mockResolvedValue({ method: "CARD", capturedAt });

		await syncAsyncPayments();

		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith("order-late", paymentIntent, {
			method: "CARD",
			capturedAt,
		});
	});

	it("should mark order as failed and restore stock when Stripe shows canceled", async () => {
		const order = {
			id: "order-2",
			orderNumber: "SYN-002",
			stripePaymentIntentId: "pi_canceled",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "canceled",
		});
		const failureDetails = { reason: "canceled" };
		mockExtractPaymentFailureDetails.mockReturnValue(failureDetails);

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith("order-2", "pi_canceled", failureDetails);
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-2");
		// Audit webhooks 2026-07-02 : fail AVANT restore — le restore ne doit jamais
		// précéder la transition gardée (sinon restock fantôme si le PI a payé entre-temps).
		expect(mockMarkOrderAsFailed.mock.invocationCallOrder[0]).toBeLessThan(
			mockRestoreStockForOrder.mock.invocationCallOrder[0]!,
		);
		expect(result!.updated).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should cancel the PI then mark order as failed when Stripe shows requires_payment_method", async () => {
		const order = {
			id: "order-3",
			orderNumber: "SYN-003",
			stripePaymentIntentId: "pi_needs_method",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "requires_payment_method",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		// Audit webhooks 2026-07-02 : payment_failed étant non-terminal côté webhook,
		// ce cron acte l'échec d'un refus carte abandonné — il DOIT canceler le PI
		// (sinon un client revenant à H+1h05 re-confirme un PI vivant → succeeded
		// sur commande CANCELLED → débit + auto-refund).
		expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_needs_method");
		expect(mockMarkOrderAsFailed).toHaveBeenCalled();
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-3");
		expect(result!.updated).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	// Audit webhooks 2026-07-02 : garde anti-PAID — le PI a été payé entre le
	// retrieve du cron et le failOrder (ou un run concurrent a déjà FAILED).
	// Ni restore, ni email, ni comptage : l'état réel fait foi.
	it("should skip restore + email and not count the order when markOrderAsFailed reports transitioned: false", async () => {
		const order = {
			id: "order-race-paid",
			orderNumber: "SYN-RACE-PAID",
			stripePaymentIntentId: "pi_race_paid",
			paymentStatus: "PENDING",
			customerEmail: "client@example.com",
			customerName: "Camille",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
		mockExtractPaymentFailureDetails.mockReturnValue({});
		mockMarkOrderAsFailed.mockResolvedValue({ transitioned: false });

		const result = await syncAsyncPayments();

		expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
		expect(mockSendPaymentFailedEmail).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
		expect(result!.errors).toBe(0);
	});

	// F1 (2026-05-29) : PI 3DS abandonné / jamais confirmé → cancel Stripe PUIS FAILED.
	it("F1: should cancel the PI then mark FAILED when Stripe shows requires_action", async () => {
		const order = {
			id: "order-3ds",
			orderNumber: "SYN-3DS",
			stripePaymentIntentId: "pi_requires_action",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			id: "pi_requires_action",
			status: "requires_action",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_requires_action");
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-3ds");
		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith("order-3ds", "pi_requires_action", {});
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(0);
	});

	it("F1: should cancel the PI then mark FAILED when Stripe shows requires_confirmation", async () => {
		const order = {
			id: "order-rc",
			orderNumber: "SYN-RC",
			stripePaymentIntentId: "pi_requires_confirmation",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			id: "pi_requires_confirmation",
			status: "requires_confirmation",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_requires_confirmation");
		expect(mockMarkOrderAsFailed).toHaveBeenCalled();
		expect(result!.updated).toBe(1);
	});

	// F1 race : le PI passe succeeded entre le retrieve et le cancel → on encaisse.
	it("F1: should process as PAID when cancel races a late succeeded PI", async () => {
		const order = {
			id: "order-race",
			orderNumber: "SYN-RACE",
			stripePaymentIntentId: "pi_race",
			paymentStatus: "PENDING",
		};
		const succeededPi = { id: "pi_race", status: "succeeded" };
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve
			.mockResolvedValueOnce({ id: "pi_race", status: "requires_action" })
			.mockResolvedValueOnce(succeededPi);
		mockStripe.paymentIntents.cancel.mockRejectedValue(
			new Error("PaymentIntent already succeeded"),
		);

		const result = await syncAsyncPayments();

		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith("order-race", succeededPi, {
			method: null,
			capturedAt: null,
		});
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(0);
	});

	// F1 : si le cancel échoue ET le PI n'est pas succeeded, on garde PENDING.
	it("F1: should keep order PENDING (errors++) when cancel fails and PI not succeeded", async () => {
		const order = {
			id: "order-cancel-fail",
			orderNumber: "SYN-CF",
			stripePaymentIntentId: "pi_cf",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve
			.mockResolvedValueOnce({ id: "pi_cf", status: "requires_action" })
			.mockResolvedValueOnce({ id: "pi_cf", status: "requires_action" });
		mockStripe.paymentIntents.cancel.mockRejectedValue(new Error("Stripe down"));

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockProcessOrderFromPaymentIntent).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
		expect(result!.errors).toBe(1);
	});

	it("should not update orders still in processing state", async () => {
		const order = {
			id: "order-4",
			orderNumber: "SYN-004",
			stripePaymentIntentId: "pi_processing",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "processing",
		});

		const result = await syncAsyncPayments();

		expect(mockProcessOrderFromPaymentIntent).not.toHaveBeenCalled();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
		expect(result!.checked).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should count errors when Stripe API call fails", async () => {
		const order = {
			id: "order-5",
			orderNumber: "SYN-005",
			stripePaymentIntentId: "pi_error",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error("Stripe API error"));

		const result = await syncAsyncPayments();

		expect(result!.errors).toBe(1);
		expect(result!.updated).toBe(0);
		expect(result!.hasMore).toBe(false);
	});

	it("should skip orders with null stripePaymentIntentId", async () => {
		const order = {
			id: "order-6",
			orderNumber: "SYN-006",
			stripePaymentIntentId: null,
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await syncAsyncPayments();

		expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
		expect(result!.checked).toBe(1);
		expect(result!.updated).toBe(0);
		expect(result!.hasMore).toBe(false);
	});

	it("should handle mixed results across multiple orders", async () => {
		const orders = [
			{
				id: "order-ok",
				orderNumber: "SYN-OK",
				stripePaymentIntentId: "pi_ok",
				paymentStatus: "PENDING",
			},
			{
				id: "order-err",
				orderNumber: "SYN-ERR",
				stripePaymentIntentId: "pi_err",
				paymentStatus: "PENDING",
			},
			{
				id: "order-pending",
				orderNumber: "SYN-PEND",
				stripePaymentIntentId: "pi_pend",
				paymentStatus: "PENDING",
			},
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve
			.mockResolvedValueOnce({ status: "succeeded" })
			.mockRejectedValueOnce(new Error("API error"))
			.mockResolvedValueOnce({ status: "processing" });

		const result = await syncAsyncPayments();

		expect(result!.checked).toBe(3);
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should return hasMore: true when exactly 25 orders are returned", async () => {
		const orders = Array.from({ length: 25 }, (_, i) => ({
			id: `order-${i}`,
			orderNumber: `SYN-${String(i).padStart(3, "0")}`,
			stripePaymentIntentId: `pi_${i}`,
			paymentStatus: "PENDING",
		}));
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "processing",
		});

		const result = await syncAsyncPayments();

		expect(result!.checked).toBe(25);
		expect(result!.hasMore).toBe(true);
	});

	it("should count an error (order already FAILED) when restoreStockForOrder fails after the transition", async () => {
		const order = {
			id: "order-stock-fail",
			orderNumber: "SYN-STOCK-FAIL",
			stripePaymentIntentId: "pi_canceled",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "canceled",
		});
		const failureDetails = { reason: "canceled" };
		mockExtractPaymentFailureDetails.mockReturnValue(failureDetails);
		mockRestoreStockForOrder.mockRejectedValue(new Error("Stock restore failed"));

		const result = await syncAsyncPayments();

		// Audit webhooks 2026-07-02 (inverse OPS-AUDIT-003) : la transition gardée
		// passe D'ABORD ; un échec du restore (no-op attendu : PENDING→FAILED implique
		// stock jamais décrémenté) laisse la commande FAILED, compte une erreur et
		// remonte l'alerte agrégée — pas d'email client, pas de comptage updated.
		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith(
			"order-stock-fail",
			"pi_canceled",
			failureDetails,
		);
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-stock-fail");
		expect(mockSendPaymentFailedEmail).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
		expect(result!.errors).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should emit exactly one aggregated admin alert when multiple stock restores fail", async () => {
		const orders = Array.from({ length: 3 }, (_, i) => ({
			id: `order-stock-fail-${i}`,
			orderNumber: `SYN-SF-${i}`,
			stripePaymentIntentId: `pi_canceled_${i}`,
			paymentStatus: "PENDING",
		}));
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
		mockExtractPaymentFailureDetails.mockReturnValue({ reason: "canceled" });
		mockRestoreStockForOrder.mockRejectedValue(new Error("Stock DB locked"));

		await syncAsyncPayments();

		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledTimes(1);
		const alertPayload = mockSendAdminCronFailedAlert.mock.calls[0]![0];
		expect(alertPayload.job).toBe("sync-async-payments");
		expect(alertPayload.errors).toBe(3);
		expect(alertPayload.details.issue).toBe("stock-restore-failed");
		expect(alertPayload.details.failures).toHaveLength(3);
		expect(alertPayload.details.failures[0]).toMatchObject({
			orderId: "order-stock-fail-0",
			orderNumber: "SYN-SF-0",
			error: "Stock DB locked",
		});
	});

	it("should not emit any admin alert when no stock restores fail", async () => {
		const order = {
			id: "order-ok",
			orderNumber: "SYN-OK",
			stripePaymentIntentId: "pi_ok",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "succeeded" });

		await syncAsyncPayments();

		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	// P2-1 : à l'abandon 3DS (requires_action → cancel → FAILED), le client doit être
	// notifié (parité avec le webhook handlePaymentFailure). idempotencyKey identique
	// au webhook ⇒ Resend dédoublonne si les deux chemins se déclenchent.
	it("P2-1: should send payment-failed email to the customer when failing an abandoned order", async () => {
		const order = {
			id: "order-abandon",
			orderNumber: "SYN-ABD",
			stripePaymentIntentId: "pi_abandon",
			paymentStatus: "PENDING",
			customerEmail: "client@example.com",
			customerName: "Camille",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			id: "pi_abandon",
			status: "requires_action",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith("order-abandon", "pi_abandon", {});
		expect(mockSendPaymentFailedEmail).toHaveBeenCalledTimes(1);
		expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				customerName: "Camille",
				orderNumber: "SYN-ABD",
				idempotencyKey: "payment-failed-order-abandon",
			}),
		);
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(0);
	});

	// P2-1 : un échec d'email ne doit jamais faire échouer le cron ni re-PENDING la
	// commande (déjà FAILED + stock restauré). Best-effort.
	it("P2-1: should not error the cron when the customer email send throws", async () => {
		const order = {
			id: "order-mailfail",
			orderNumber: "SYN-MF",
			stripePaymentIntentId: "pi_mailfail",
			paymentStatus: "PENDING",
			customerEmail: "client@example.com",
			customerName: "Camille",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
		mockExtractPaymentFailureDetails.mockReturnValue({});
		mockSendPaymentFailedEmail.mockRejectedValue(new Error("Resend down"));

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalled();
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(0);
	});

	// P2-1 : pas d'email client sur un PI réconcilié comme succeeded (succès, pas échec).
	it("P2-1: should NOT send a payment-failed email when Stripe shows succeeded", async () => {
		const order = {
			id: "order-paid",
			orderNumber: "SYN-PAID",
			stripePaymentIntentId: "pi_paid",
			paymentStatus: "PENDING",
			customerEmail: "client@example.com",
			customerName: "Camille",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ id: "pi_paid", status: "succeeded" });

		await syncAsyncPayments();

		expect(mockSendPaymentFailedEmail).not.toHaveBeenCalled();
	});
});
