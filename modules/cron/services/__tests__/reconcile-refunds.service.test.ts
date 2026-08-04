import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockStripe,
	mockGetStripeClient,
	mockCanTransition,
	mockCaptureRefundError,
	mockInitiateAutomaticRefund,
	mockSendRefundFailureAlert,
	mockSendRefundConfirmationOnce,
} = vi.hoisted(() => ({
	mockPrisma: {
		refund: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			updateMany: vi.fn(),
			update: vi.fn(),
			aggregate: vi.fn(),
		},
		// finalizeRefund restocke désormais l'inventory (P2-1) : refundItem +
		// productSku sont lus dans la transaction de finalisation.
		refundItem: { findMany: vi.fn() },
		productSku: { findMany: vi.fn() },
		order: { update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
		orderHistory: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockStripe: {
		refunds: { retrieve: vi.fn() },
	},
	mockGetStripeClient: vi.fn(),
	mockCanTransition: vi.fn(() => true),
	mockCaptureRefundError: vi.fn(),
	mockInitiateAutomaticRefund: vi.fn(),
	mockSendRefundFailureAlert: vi.fn(),
	mockSendRefundConfirmationOnce: vi.fn(),
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

vi.mock("@/modules/refunds/services/refund-state-machine.service", () => ({
	canTransition: mockCanTransition,
}));

vi.mock("@/modules/refunds/utils/capture-refund-error", () => ({
	captureRefundError: mockCaptureRefundError,
}));

// AM-1 : la phase 2 (retry des auto-refunds bloqués sans stripeRefundId) emprunte
// `initiateAutomaticRefund` et `sendRefundFailureAlert` du service paiement webhook.
vi.mock("@/modules/webhooks/services/payment-intent.service", () => ({
	AUTO_REFUND_NOTE_PREFIX: "Auto-refund payment_failed webhook",
	initiateAutomaticRefund: mockInitiateAutomaticRefund,
	sendRefundFailureAlert: mockSendRefundFailureAlert,
}));

// EINV-CREDIT-020 : voidInvoice / issueCreditNoteForRefund (importés réels par
// ce cron) archivent désormais eagerly l'avoir via ces services, dont la chaîne
// d'import instancie UploadThing au chargement — mock au niveau module.
vi.mock("@/modules/orders/services/ensure-credit-note-archived.service", () => ({
	ensureOrderCreditNoteArchived: vi.fn().mockResolvedValue("already-archived"),
}));
vi.mock("@/modules/refunds/services/ensure-credit-note-archived.service", () => ({
	ensureRefundCreditNoteArchived: vi.fn().mockResolvedValue("already-archived"),
}));

vi.mock("@/modules/refunds/services/send-refund-confirmation.service", () => ({
	sendRefundConfirmationOnce: mockSendRefundConfirmationOnce,
}));

import { revalidateTag } from "next/cache";
import { reconcileRefunds } from "../reconcile-refunds.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

function buildCandidate(overrides: Partial<{ id: string; stripeRefundId: string }> = {}) {
	return {
		id: overrides.id ?? "refund-1",
		stripeRefundId: overrides.stripeRefundId ?? "re_test_1",
		amount: 2000,
		orderId: "order-1",
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			total: 5000,
			userId: "user-1",
		},
	};
}

/**
 * `prisma.refund.findUnique` sert 4 lectures distinctes dans la passe (self-load
 * de `finalizeRefundCompletion`, lecture interne d'issueCreditNoteForRefund,
 * re-fetch des numéros de pièces pour l'email, diagnostic de claim raté) — on
 * dispatche sur la FORME du select plutôt que d'empiler des `mockResolvedValueOnce`
 * fragiles à l'ordre d'appel.
 */
function primeRefundFindUnique(
	overrides: {
		order?: Record<string, unknown>;
		facts?: {
			creditNoteNumber: string | null;
			order: { invoiceNumber: string | null; creditNoteNumber: string | null };
		};
		claimStatus?: string;
	} = {},
) {
	mockPrisma.refund.findUnique.mockImplementation(async (args: any) => {
		const sel = args?.select ?? {};
		if (sel.order?.select?.customerEmail) {
			// Self-load de finalizeRefundCompletion
			return {
				id: args.where.id,
				amount: 2000,
				reason: "CUSTOMER_REQUEST",
				stripeRefundId: "re_test_1",
				order: {
					id: "order-1",
					orderNumber: "SYN-001",
					total: 5000,
					customerEmail: null,
					customerName: null,
					...(overrides.order ?? {}),
				},
			};
		}
		if (sel.status && sel.creditNoteNumber) {
			// Lecture interne d'issueCreditNoteForRefund → null = noop "missing"
			return null;
		}
		if (sel.creditNoteNumber) {
			// Re-fetch des numéros de pièces pour l'email
			return (
				overrides.facts ?? {
					creditNoteNumber: null,
					order: { invoiceNumber: null, creditNoteNumber: null },
				}
			);
		}
		if (sel.status) {
			// Diagnostic après claim raté
			return { status: overrides.claimStatus ?? "COMPLETED" };
		}
		return null;
	});
}

describe("reconcileRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
		// Défaut persistant : aucun candidat. Les tests de la phase 1 (finalisation)
		// surchargent le PREMIER appel via `mockResolvedValueOnce`, de sorte que le
		// 2ᵉ appel (phase 2 AM-1) retombe sur ce défaut vide → no-op.
		mockPrisma.refund.findMany.mockResolvedValue([]);
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.refund.update.mockResolvedValue({});
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		// Pas de restock par défaut (finalizeRefund P2-1) ni d'avoir fallback (P2-2).
		mockPrisma.refundItem.findMany.mockResolvedValue([]);
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		primeRefundFindUnique();
		mockPrisma.order.findUnique.mockResolvedValue(null);
		// OVERBILL-RESOLVE-01 : par défaut aucune commande sur-facturée à résoudre.
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
		mockInitiateAutomaticRefund.mockResolvedValue({ success: true, refundId: "re_retry" });
		mockSendRefundFailureAlert.mockResolvedValue(undefined);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
			fn(mockPrisma),
		);
		mockCanTransition.mockReturnValue(true);
	});

	it("returns skipped result with STRIPE_KEY_MISSING when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await reconcileRefunds();

		expect(result).toEqual({
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		});
	});

	it("returns zero counts when no candidates exist", async () => {
		const result = await reconcileRefunds();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0, hasMore: false });
	});

	it("queries refunds with APPROVED status, stripeRefundId set, processedAt null, in 90d window", async () => {
		await reconcileRefunds();

		const call = mockPrisma.refund.findMany.mock.calls[0]![0];
		expect(call.where.status).toBe("APPROVED");
		expect(call.where.stripeRefundId).toEqual({ not: null });
		expect(call.where.processedAt).toBeNull();

		const ninetyDays = 90 * 24 * 60 * 60 * 1000;
		const expectedMaxAge = new Date(Date.now() - ninetyDays);
		const expectedMinAge = new Date(Date.now() - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS);
		expect(call.where.createdAt.gte.getTime()).toBe(expectedMaxAge.getTime());
		expect(call.where.createdAt.lt.getTime()).toBe(expectedMinAge.getTime());
	});

	it("finalises a refund to COMPLETED when Stripe says succeeded (partial refund → PARTIALLY_REFUNDED)", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });

		const result = await reconcileRefunds();

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "refund-1", status: "APPROVED" },
			data: expect.objectContaining({
				status: "COMPLETED",
				processedAt: expect.any(Date),
			}),
		});
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "PARTIALLY_REFUNDED" },
		});
		expect(result).toMatchObject({ processed: 1, errored: 0, skipped: 0 });
	});

	it("flags the order as REFUNDED when totalRefunded reaches orderTotal", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

		await reconcileRefunds();

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});
	});

	it("passes the freshly issued invoice/credit-note numbers to the confirmation email", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
		// Re-fetch post-émission de l'avoir : l'email doit porter les numéros de
		// pièces (F-/A-) comme le path admin, pas des null en dur. Le destinataire
		// vient du self-load de finalizeRefundCompletion (snapshot customerEmail).
		primeRefundFindUnique({
			order: { customerEmail: "client@test.fr", customerName: "Marie Dupont" },
			facts: {
				creditNoteNumber: "A-2026-00042",
				order: { invoiceNumber: "F-2026-00007", creditNoteNumber: null },
			},
		});
		mockSendRefundConfirmationOnce.mockResolvedValue({ sent: true, skipped: false });

		await reconcileRefunds();

		expect(mockSendRefundConfirmationOnce).toHaveBeenCalledWith(
			expect.objectContaining({
				refundId: "refund-1",
				to: "client@test.fr",
				invoiceNumber: "F-2026-00007",
				creditNoteNumber: "A-2026-00042",
			}),
		);
	});

	it("falls back to the order credit note number for a full refund finalised by the cron", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
		// Full refund : l'avoir vit sur Order.creditNoteNumber (voidInvoice),
		// Refund.creditNoteNumber reste null (EINV-SEQ-001).
		primeRefundFindUnique({
			order: { customerEmail: "client@test.fr", customerName: "Marie Dupont" },
			facts: {
				creditNoteNumber: null,
				order: { invoiceNumber: "F-2026-00007", creditNoteNumber: "A-2026-00043" },
			},
		});
		mockSendRefundConfirmationOnce.mockResolvedValue({ sent: true, skipped: false });

		await reconcileRefunds();

		expect(mockSendRefundConfirmationOnce).toHaveBeenCalledWith(
			expect.objectContaining({
				refundId: "refund-1",
				invoiceNumber: "F-2026-00007",
				creditNoteNumber: "A-2026-00043",
			}),
		);
	});

	it("marks refund FAILED locally when Stripe says failed", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({
			status: "failed",
			failure_reason: "expired_or_canceled_card",
		});
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		const result = await reconcileRefunds();

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "refund-1", status: "APPROVED" },
			data: { status: "FAILED", failureReason: "expired_or_canceled_card" },
		});
		expect(result).toMatchObject({ processed: 1, errored: 0, skipped: 0 });
	});

	it("skips pending refunds (the webhook will pick them up)", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "pending" });

		const result = await reconcileRefunds();

		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("skips refund with null stripeRefundId without calling Stripe", async () => {
		const candidate = buildCandidate();
		mockPrisma.refund.findMany.mockResolvedValueOnce([{ ...candidate, stripeRefundId: null }]);

		const result = await reconcileRefunds();

		expect(mockStripe.refunds.retrieve).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("counts as skipped when the optimistic guard misses (concurrent webhook reconciliation race)", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		// Simulates the webhook beating the cron : `status: APPROVED` no longer matches.
		// Le diagnostic post-claim (select { status }) est servi par primeRefundFindUnique.
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });
		mockCanTransition.mockReturnValue(false);

		const result = await reconcileRefunds();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("captures and counts a Stripe API error as errored without aborting the batch", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([
			buildCandidate({ id: "r1", stripeRefundId: "re_err" }),
			buildCandidate({ id: "r2", stripeRefundId: "re_ok" }),
		]);
		mockStripe.refunds.retrieve
			.mockRejectedValueOnce(new Error("Stripe 502"))
			.mockResolvedValueOnce({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });

		const result = await reconcileRefunds();

		expect(mockCaptureRefundError).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({ processed: 1, errored: 1, skipped: 0 });
	});

	it("flags hasMore: true when BATCH_SIZE_MEDIUM (25) candidates are returned", async () => {
		const candidates = Array.from({ length: 25 }, (_, i) =>
			buildCandidate({ id: `r${i}`, stripeRefundId: `re_${i}` }),
		);
		mockPrisma.refund.findMany.mockResolvedValueOnce(candidates);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "pending" });

		const result = await reconcileRefunds();

		expect(result.hasMore).toBe(true);
	});

	it("writes a SYSTEM OrderHistory entry on successful COMPLETED finalisation (DLQ audit trail)", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

		await reconcileRefunds();

		expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				orderId: "order-1",
				action: "REFUND_COMPLETED",
				source: "SYSTEM",
				authorName: "Système (reconcile-refunds)",
				newPaymentStatus: "REFUNDED",
				metadata: expect.objectContaining({
					refundId: "refund-1",
					reason: "stripe_dlq_reconcile",
				}),
			}),
		});
	});

	// === AM-1 : phase 2 — retry des auto-refunds dont la création Stripe a échoué ===

	function buildStuckAutoRefund(
		overrides: Partial<{
			id: string;
			attemptCount: number;
			stripePaymentIntentId: string | null;
		}> = {},
	) {
		return {
			id: overrides.id ?? "refund-stuck",
			orderId: "order-9",
			attemptCount: overrides.attemptCount ?? 0,
			order: {
				stripePaymentIntentId:
					overrides.stripePaymentIntentId === undefined ? "pi_9" : overrides.stripePaymentIntentId,
				orderNumber: "SYN-009",
			},
		};
	}

	it("retries a stuck auto-refund (no stripeRefundId) via initiateAutomaticRefund", async () => {
		// Phase 1 : aucun candidat ; phase 2 : un auto-refund bloqué.
		mockPrisma.refund.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([buildStuckAutoRefund()]);

		const result = await reconcileRefunds();

		// Borne d'abord (increment attemptCount), puis appel Stripe via le helper.
		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-stuck" },
			data: { attemptCount: { increment: 1 } },
		});
		expect(mockInitiateAutomaticRefund).toHaveBeenCalledWith("pi_9", "order-9", expect.any(String));
		expect(mockSendRefundFailureAlert).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 1, errored: 0 });
	});

	it("alerts admin when a stuck auto-refund exhausts create retries", async () => {
		mockPrisma.refund.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([buildStuckAutoRefund({ attemptCount: 4 })]);
		mockInitiateAutomaticRefund.mockResolvedValue({
			success: false,
			error: new Error("Stripe unavailable"),
		});

		const result = await reconcileRefunds();

		// attemptCount passe de 4 → 5 (= AUTO_REFUND_MAX_CREATE_ATTEMPTS) → alerte.
		expect(mockSendRefundFailureAlert).toHaveBeenCalledWith(
			"order-9",
			"pi_9",
			"other",
			expect.stringContaining("après 5 tentatives"),
		);
		expect(result).toMatchObject({ errored: 1 });
	});

	it("skips a stuck auto-refund whose order has no PaymentIntent (anomaly, no Stripe call)", async () => {
		mockPrisma.refund.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([buildStuckAutoRefund({ stripePaymentIntentId: null })]);

		await reconcileRefunds();

		expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("writes a SYSTEM OrderHistory entry on FAILED finalisation (DLQ audit trail)", async () => {
		mockPrisma.refund.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({
			status: "failed",
			failure_reason: "expired_or_canceled_card",
		});
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		await reconcileRefunds();

		expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				orderId: "order-1",
				action: "REFUND_FAILED",
				source: "SYSTEM",
				authorName: "Système (reconcile-refunds)",
				metadata: expect.objectContaining({
					refundId: "refund-1",
					failureReason: "expired_or_canceled_card",
					reason: "stripe_dlq_reconcile",
				}),
			}),
		});
	});

	// ========================================================================
	// OVERBILL-RESOLVE-01 — auto-résolution de la sur-facturation
	// ========================================================================
	describe("overbilling auto-resolution", () => {
		it("scanne les commandes sur-facturées non résolues", async () => {
			await reconcileRefunds();

			const overbillCall = mockPrisma.order.findMany.mock.calls.find(
				(c) => c[0]?.where?.overbilledAmountCents !== undefined,
			);
			expect(overbillCall).toBeDefined();
			expect(overbillCall![0].where).toMatchObject({
				overbilledAmountCents: { not: null },
				overbillingResolvedAt: null,
				deletedAt: null,
			});
		});

		/**
		 * OVERBILL-RESOLVE-02 : seul le refund.findMany de la passe overbilling
		 * filtre `status: "COMPLETED"` (phase 1 = APPROVED, phase 2 AM-1 = FAILED) —
		 * on discrimine dessus pour ne pas perturber les autres passes.
		 */
		function mockCompletedRefunds(refunds: Array<{ amount: number }>) {
			mockPrisma.refund.findMany.mockImplementation(
				async (args?: { where?: { status?: string } }) =>
					args?.where?.status === "COMPLETED" ? refunds : [],
			);
		}

		function mockOverbilledCandidate(overrides: Partial<{ total: number; delta: number }> = {}) {
			mockPrisma.order.findMany.mockResolvedValueOnce([
				{
					id: "order-ob",
					orderNumber: "SYN-OB",
					total: overrides.total ?? 5000,
					overbilledAmountCents: overrides.delta ?? 500,
					userId: "user-ob",
				},
			]);
		}

		it("pose overbillingResolvedAt quand un refund COMPLETED du montant EXACT du delta existe", async () => {
			mockOverbilledCandidate();
			mockCompletedRefunds([{ amount: 500 }]);
			mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 1 });

			const result = await reconcileRefunds();

			expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
				where: { id: "order-ob", overbillingResolvedAt: null },
				data: { overbillingResolvedAt: expect.any(Date) },
			});
			expect(result.processed).toBeGreaterThanOrEqual(1);
		});

		it("pose overbillingResolvedAt quand le cumul remboursé couvre total + delta (tout restitué)", async () => {
			mockOverbilledCandidate();
			// 5000 (retour intégral) + 500 : le delta est nécessairement restitué.
			mockCompletedRefunds([{ amount: 5000 }, { amount: 500 }]);
			mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 1 });

			await reconcileRefunds();

			expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
				where: { id: "order-ob", overbillingResolvedAt: null },
				data: { overbillingResolvedAt: expect.any(Date) },
			});
		});

		it("ne résout PAS tant que les refunds COMPLETED ne couvrent pas le delta", async () => {
			mockOverbilledCandidate();
			// Trop-perçu 500 mais seulement 200 remboursés → pas de résolution.
			mockCompletedRefunds([{ amount: 200 }]);

			await reconcileRefunds();

			expect(mockPrisma.order.updateMany).not.toHaveBeenCalledWith(
				expect.objectContaining({
					data: { overbillingResolvedAt: expect.any(Date) },
				}),
			);
		});

		// Audit statuts commande 2026-07-02 (F4) : la résolution change la fiche
		// commande admin + le dashboard « À traiter » — les tags par-commande/user
		// (getOrderInvalidationTags) doivent être flushés, pas seulement les
		// listes globales (sinon stale ~10 min profil `user`).
		it("invalide les tags par-commande/user à la résolution", async () => {
			mockOverbilledCandidate();
			mockCompletedRefunds([{ amount: 500 }]);
			mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 1 });

			await reconcileRefunds();

			const tags = vi.mocked(revalidateTag).mock.calls.map((c) => c[0]);
			expect(tags).toEqual(expect.arrayContaining(["order-detail-order-ob"]));
		});

		it("n'invalide PAS les tags par-commande quand rien n'est résolu (count === 0)", async () => {
			mockOverbilledCandidate();
			mockCompletedRefunds([{ amount: 500 }]);
			// Un run concurrent a déjà résolu : updateMany ne matche aucune ligne.
			mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 0 });

			await reconcileRefunds();

			const tags = vi.mocked(revalidateTag).mock.calls.map((c) => c[0]);
			expect(tags).not.toContain("order-detail-order-ob");
		});

		it("ne résout PAS sur un refund non lié (retour produit ≥ delta mais ≠ delta) — OVERBILL-RESOLVE-02", async () => {
			mockOverbilledCandidate();
			// Retour produit de 2000 : couvre le delta (500) en cumul mais n'est ni un
			// refund exact du delta ni une restitution totale (2000 < 5500). L'ancien
			// critère `cumul >= delta` aurait résolu à tort.
			mockCompletedRefunds([{ amount: 2000 }]);

			await reconcileRefunds();

			expect(mockPrisma.order.updateMany).not.toHaveBeenCalledWith(
				expect.objectContaining({
					data: { overbillingResolvedAt: expect.any(Date) },
				}),
			);
		});
	});
});
