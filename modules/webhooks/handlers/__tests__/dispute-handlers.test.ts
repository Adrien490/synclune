import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockTx,
	mockPrisma,
	mockGetBaseUrl,
	mockROUTES,
	mockCreateOrderAuditTx,
	mockVoidInvoice,
	mockIssueCreditNoteForRefund,
} = vi.hoisted(() => {
	const mockTx = {
		// IDEM-DISPUTE-001 : `SELECT … FOR UPDATE` de sérialisation en tête des
		// transactions dispute (created + closed).
		$queryRaw: vi.fn(),
		order: {
			update: vi.fn(),
		},
		refund: {
			aggregate: vi.fn(),
			create: vi.fn(),
		},
		orderHistory: {
			// IDEM-DISPUTE-001 : re-lecture autoritative de la garde sous le verrou.
			// Depuis le retrait du modèle `Dispute` (V1), l'anti-rejeu s'appuie sur
			// l'audit trail (`note` préfixée) et non plus sur un `OrderNote`.
			findFirst: vi.fn(),
			create: vi.fn(),
		},
	};

	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn(),
			order: {
				findFirst: vi.fn(),
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			orderHistory: {
				findFirst: vi.fn(),
			},
		},
		mockGetBaseUrl: vi.fn(),
		mockROUTES: {
			ADMIN: {
				ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
			},
		},
		mockCreateOrderAuditTx: vi.fn(),
		mockVoidInvoice: vi.fn(),
		mockIssueCreditNoteForRefund: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: (path: string) => `https://synclune.fr${path}`,
	getBaseUrl: mockGetBaseUrl,
	ROUTES: mockROUTES,
	EXTERNAL_URLS: {
		STRIPE: {
			DISPUTE: (disputeId: string) => `https://dashboard.stripe.com/test/disputes/${disputeId}`,
		},
	},
}));

// CACHE-AUDIT-010 : `@/modules/orders/constants/cache` est chargé POUR DE VRAI.
// Il ne contient que des constantes et une fonction pure (aucun import de `next/cache`),
// donc rien à mocker. Le miroir manuel qui vivait ici recopiait les 6 tags à la main et
// ne bougeait pas quand la SSOT changeait : il aurait laissé passer l'absence de
// `REFUNDS(orderId)` sur le chargeback perdu, que ce fichier est censé garder.

// `@/shared/constants/cache-tags` chargé POUR DE VRAI : fichier de constantes pures.
// Le mock partiel qui vivait ici n'exposait qu'`ADMIN_BADGES`, donc `ADMIN_ORDERS_LIST`
// arrivait à `undefined` dans les tags assertés — l'assertion ci-dessous validait un
// trou d'invalidation au lieu de le signaler.

vi.mock("@/app/generated/prisma/client", () => ({
	HistorySource: { ADMIN: "ADMIN", WEBHOOK: "WEBHOOK", SYSTEM: "SYSTEM", CUSTOMER: "CUSTOMER" },
	InvoiceStatus: {
		PENDING: "PENDING",
		GENERATED: "GENERATED",
		VOIDED: "VOIDED",
	},
	OrderAction: {
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
		REFUND_FAILED: "REFUND_FAILED",
		DISPUTE_OPENED: "DISPUTE_OPENED",
		DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
	},
	PaymentStatus: {
		PAID: "PAID",
		REFUNDED: "REFUNDED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
	},
	RefundReason: {
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
	RefundStatus: {
		COMPLETED: "COMPLETED",
	},
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

vi.mock("@/modules/refunds/services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: mockIssueCreditNoteForRefund,
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: (cb: (scope: Record<string, () => void>) => void) =>
		cb({
			setLevel: vi.fn(),
			setTag: vi.fn(),
			setFingerprint: vi.fn(),
			setContext: vi.fn(),
		}),
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	// logger.warn (skip order-introuvable, ORD-STRIPE-DISPUTE-001) émet un breadcrumb.
	addBreadcrumb: vi.fn(),
}));

import { handleDisputeCreated, handleDisputeClosed } from "../dispute-handlers";

// ============================================================================
// Helpers
// ============================================================================

function makeDispute(overrides: Partial<Stripe.Dispute> = {}): Stripe.Dispute {
	return {
		id: "dp_test_1",
		object: "dispute",
		amount: 5000,
		reason: "fraudulent",
		status: "needs_response",
		payment_intent: "pi_test_1",
		balance_transactions: [],
		evidence_details: {
			due_by: 1740000000, // Unix timestamp
			has_evidence: false,
			past_due: false,
			submission_count: 0,
		},
		...overrides,
	} as unknown as Stripe.Dispute;
}

function makeOrder(
	overrides: Partial<{
		id: string;
		orderNumber: string;
		customerEmail: string | null;
		paymentStatus: string;
		total: number;
	}> = {},
) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		customerEmail: "client@test.com",
		paymentStatus: "PAID",
		total: 5000,
		...overrides,
	};
}

// ============================================================================
// handleDisputeCreated
// ============================================================================

describe("handleDisputeCreated", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
		mockTx.orderHistory.create.mockResolvedValue({});
	});

	it("should record the audit trail and return ADMIN_DISPUTE_ALERT + INVALIDATE_CACHE tasks on success", async () => {
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		// L'audit trail est le SEUL enregistrement local du litige depuis le retrait
		// du modèle `Dispute` : il porte la note préfixée (qui sert d'anti-rejeu) et
		// les métadonnées Stripe brutes (raison non mappée, deadline, montant).
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockTx,
			expect.objectContaining({
				orderId: "order-1",
				action: "DISPUTE_OPENED",
				source: "WEBHOOK",
				authorName: "Système (webhook Stripe)",
				note: expect.stringContaining("[LITIGE OUVERT] Litige Stripe dp_test_1"),
				metadata: expect.objectContaining({
					stripeDisputeId: "dp_test_1",
					amount: 5000,
					reason: "fraudulent",
				}),
			}),
		);

		expect(result).toEqual({
			success: true,
			tasks: [
				{
					type: "ADMIN_DISPUTE_ALERT",
					data: expect.objectContaining({
						orderNumber: "SYN-001",
						customerEmail: "client@test.com",
						amount: 5000,
						disputeId: "dp_test_1",
						dashboardUrl: "https://synclune.fr/admin/ventes/commandes/order-1",
						stripeDashboardUrl: "https://dashboard.stripe.com/test/disputes/dp_test_1",
					}),
				},
				{
					type: "INVALIDATE_CACHE",
					// L'ouverture de litige passe par `getOrderInvalidationTags` comme tout le
					// reste : elle ne mute aucune colonne d'`Order` (audit trail seul), donc
					// rien n'était réellement périmé avec l'ancienne liste manuelle
					// `[LIST, HISTORY, ADMIN_BADGES]` — mais une liste écrite à la main dérive
					// dès que la SSOT gagne un tag, et le garde-fou la refuse désormais.
					tags: [
						"orders-list",
						"admin-badges",
						"admin-orders-list",
						"order-history-order-1",
						"order-confirmation-order-1",
						"order-detail-order-1",
					],
				},
			],
		});
	});

	it("should throw an error when the dispute has no payment_intent", async () => {
		const dispute = makeDispute({ payment_intent: null as unknown as string });

		await expect(handleDisputeCreated(dispute)).rejects.toThrow(
			"Dispute dp_test_1 has no payment_intent",
		);

		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("should skip gracefully (no throw) when no order is found for the payment intent", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);
		const dispute = makeDispute();

		// ORD-STRIPE-DISPUTE-001 : skip propre (200) plutôt que throw → pas de
		// tempête de retries Stripe ni d'alerte « max retries exhausted ».
		const result = await handleDisputeCreated(dispute);

		expect(result).toEqual({ success: true, skipped: true, reason: "Order not found" });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip and return skipped result when a duplicate note already exists (idempotence)", async () => {
		mockPrisma.orderHistory.findFirst.mockResolvedValue({ id: "note-existing-1" });
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Dispute already recorded",
		});
	});

	it("should map known dispute reason to the French label", async () => {
		const dispute = makeDispute({ reason: "product_not_received" });

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ reason: "Produit non reçu" });
	});

	it("should fall back to the raw reason string when the label is unknown", async () => {
		const dispute = makeDispute({ reason: "bank_cannot_process" as Stripe.Dispute["reason"] });

		await handleDisputeCreated(dispute);

		const auditCall = mockCreateOrderAuditTx.mock.calls[0]![1];
		expect(auditCall.note).toContain("bank_cannot_process");
	});

	it("should show N/A for deadline when evidence_details.due_by is missing", async () => {
		const dispute = makeDispute({
			evidence_details: {
				due_by: null,
				has_evidence: false,
				past_due: false,
				submission_count: 0,
			} as Stripe.Dispute.EvidenceDetails,
		});

		await handleDisputeCreated(dispute);

		const auditCall = mockCreateOrderAuditTx.mock.calls[0]![1];
		expect(auditCall.note).toContain("Deadline de réponse: N/A");
	});

	it("should set deadline to null in task data when evidence_details.due_by is missing", async () => {
		const dispute = makeDispute({
			evidence_details: {
				due_by: null,
				has_evidence: false,
				past_due: false,
				submission_count: 0,
			} as Stripe.Dispute.EvidenceDetails,
		});

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ deadline: null });
	});

	it("should extract payment_intent id when payment_intent is an object", async () => {
		const dispute = makeDispute({
			payment_intent: { id: "pi_object_1" } as unknown as string,
		});

		await handleDisputeCreated(dispute);

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ stripePaymentIntentId: "pi_object_1" }),
			}),
		);
	});

	it("should use fallback email when customerEmail is null", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ customerEmail: null }));
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ customerEmail: "Email non disponible" });
	});
});

// ============================================================================
// handleDisputeClosed
// ============================================================================

describe("handleDisputeClosed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 5000 }));
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
		mockTx.order.update.mockResolvedValue({});
		mockTx.orderHistory.create.mockResolvedValue({});
		// ORD-REFUND-010: chargeback materialization needs aggregate + create
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-chargeback-1" });
		// Post-tx accounting wiring : par défaut pas de facture active (void skip),
		// services best-effort résolus en noop.
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockVoidInvoice.mockResolvedValue({ kind: "noop", reason: "no-active-invoice" });
		mockIssueCreditNoteForRefund.mockResolvedValue({ kind: "noop", reason: "missing" });
	});

	it("should create a won note, update Dispute, and NOT update paymentStatus when dispute is won", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		// L'audit trail porte le libellé de clôture
		const auditCall = mockCreateOrderAuditTx.mock.calls[0]![1];
		expect(auditCall.note).toContain("[LITIGE CLOTURE] Litige dp_test_1 clôturé: gagné");
		expect(auditCall.note).not.toContain("Le montant a été débité par Stripe.");

		// paymentStatus must not be touched
		expect(mockTx.order.update).not.toHaveBeenCalled();

		// No admin alert on dispute close (only emitted on dispute open)
		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
		expect(result?.success).toBe(true);
	});

	it("should create a lost note, update Dispute, and update paymentStatus to REFUNDED when dispute is lost", async () => {
		const dispute = makeDispute({ status: "lost" });

		const result = await handleDisputeClosed(dispute);

		// L'audit trail porte le libellé de clôture
		const auditCall = mockCreateOrderAuditTx.mock.calls[0]![1];
		expect(auditCall.note).toContain("[LITIGE CLOTURE] Litige dp_test_1 clôturé: perdu");
		expect(auditCall.note).toContain("Le montant a été débité par Stripe.");

		// paymentStatus must be updated to REFUNDED
		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});

		// No admin alert on dispute close (only emitted on dispute open)
		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
		expect(result?.success).toBe(true);
	});

	it("should create note but NOT update paymentStatus when dispute is lost and order is already REFUNDED", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ paymentStatus: "REFUNDED" }));
		const dispute = makeDispute({ status: "lost" });

		await handleDisputeClosed(dispute);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
		// No redundant paymentStatus update
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should throw an error when the dispute has no payment_intent", async () => {
		const dispute = makeDispute({ payment_intent: null as unknown as string });

		await expect(handleDisputeClosed(dispute)).rejects.toThrow(
			"Dispute dp_test_1 closed has no payment_intent",
		);

		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("should skip gracefully (no throw) when no order is found for the payment intent", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);
		const dispute = makeDispute({ status: "won" });

		// ORD-STRIPE-DISPUTE-001 : skip propre (200) plutôt que throw.
		const result = await handleDisputeClosed(dispute);

		expect(result).toEqual({ success: true, skipped: true, reason: "Order not found" });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip and return skipped result when a duplicate note already exists (idempotence)", async () => {
		mockPrisma.orderHistory.findFirst.mockResolvedValue({ id: "note-existing-2" });
		const dispute = makeDispute({ status: "lost" });

		const result = await handleDisputeClosed(dispute);

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Dispute closure already recorded",
		});
	});

	it("should include INVALIDATE_CACHE task with correct tags", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		const cacheTask = result?.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		// CACHE-AUDIT-010 : helper canonique. Le tag NOTES a disparu avec les OrderNote
		// de litige — l'issue vit dans HISTORY, que le helper couvre déjà. Les trois
		// tags user-scopés sont partis au retrait de l'espace client (2026-07-31).
		//
		// `order-refunds-order-1` : la branche `lost` matérialise le chargeback en
		// `Refund` COMPLETED, donc l'onglet remboursements du détail commande et le
		// formulaire `/remboursements/nouveau` doivent le voir. Poussé sur TOUTES les
		// clôtures (ici `won`) — sur-invalider une entrée inchangée coûte moins qu'une
		// branche de plus à tenir juste.
		expect(cacheTask).toEqual({
			type: "INVALIDATE_CACHE",
			tags: [
				"orders-list",
				"admin-badges",
				"admin-orders-list",
				"order-history-order-1",
				"order-confirmation-order-1",
				"order-detail-order-1",
				"order-refunds-order-1",
			],
		});
	});

	it("should emit ONLY an INVALIDATE_CACHE task (no admin alert on close)", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		expect(result?.tasks).toHaveLength(1);
		expect(result?.tasks?.[0]?.type).toBe("INVALIDATE_CACHE");
		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
	});

	it("should extract payment_intent id when payment_intent is an object", async () => {
		const dispute = makeDispute({
			status: "won",
			payment_intent: { id: "pi_object_2" } as unknown as string,
		});

		await handleDisputeClosed(dispute);

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ stripePaymentIntentId: "pi_object_2" }),
			}),
		);
	});

	it("should audit the closure of a dispute that was never recorded locally", async () => {
		// Cas réel : `charge.dispute.closed` peut arriver sans que `created` ait été
		// reçu (endpoint abonné en cours de litige). Il n'y a plus de miroir à
		// retrouver — la clôture s'audite quand même.
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		const dispute = makeDispute({ status: "won" });

		await handleDisputeClosed(dispute);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
	});
});

// @regression dispute-closed-non-loss-no-phantom-refund-2026-05-30
// P1-A : SEUL un litige `lost` reprend des fonds. Un statut de clôture ≠ lost
// (notamment `warning_closed` = inquiry/retrieval close SANS débit, ou
// `charge_refunded` = déjà remboursé via charge.refunded) ne doit JAMAIS
// matérialiser un Refund fantôme, muter paymentStatus, voider la facture ni
// émettre une ligne DGFiP. L'ancien binaire `won = status === "won"` bookait
// tout ≠ won comme une perte totale → remboursement + avoir + e-reporting faux.
describe("handleDisputeClosed — non-loss closures emit no accounting (regression P1-A)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 5000 }));
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
		mockTx.order.update.mockResolvedValue({});
		mockTx.orderHistory.create.mockResolvedValue({});
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-chargeback-1" });
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockVoidInvoice.mockResolvedValue({ kind: "noop", reason: "no-active-invoice" });
		mockIssueCreditNoteForRefund.mockResolvedValue({ kind: "noop", reason: "missing" });
	});

	it("warning_closed (inquiry, no debit) → no Refund, no paymentStatus mutation, no void/credit-note", async () => {
		const dispute = makeDispute({ status: "warning_closed" as Stripe.Dispute["status"] });

		const result = await handleDisputeClosed(dispute);

		// Clôture auditée, mais AUCUNE compta
		expect(mockTx.refund.create).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockVoidInvoice).not.toHaveBeenCalled();
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();

		const auditCall = mockCreateOrderAuditTx.mock.calls[0]![1];
		expect(auditCall.note).toContain(
			"[LITIGE CLOTURE] Litige dp_test_1 clôturé: clôturé sans débit",
		);
		expect(auditCall.note).not.toContain("Le montant a été débité par Stripe.");
		expect(result?.success).toBe(true);
	});

	it("charge_refunded (already refunded) → no second phantom Refund", async () => {
		const dispute = makeDispute({ status: "charge_refunded" as Stripe.Dispute["status"] });

		await handleDisputeClosed(dispute);

		expect(mockTx.refund.create).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockVoidInvoice).not.toHaveBeenCalled();
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Dispute reason and fee mapping
// ============================================================================

describe("handleDisputeCreated - reason and fee mapping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
		mockTx.orderHistory.create.mockResolvedValue({});
	});

	it("should store balance_transactions[0].fee in the audit metadata when present", async () => {
		const dispute = makeDispute({
			balance_transactions: [{ fee: 1500 }] as unknown as Stripe.Dispute["balance_transactions"],
		});

		await handleDisputeCreated(dispute);

		expect(mockCreateOrderAuditTx.mock.calls[0]![1].metadata).toMatchObject({ fee: 1500 });
	});

	it("should default fee to 0 when balance_transactions is empty", async () => {
		const dispute = makeDispute({ balance_transactions: [] });

		await handleDisputeCreated(dispute);

		expect(mockCreateOrderAuditTx.mock.calls[0]![1].metadata).toMatchObject({ fee: 0 });
	});

	// Le retrait du modèle `Dispute` a supprimé `STRIPE_REASON_MAP` : il n'y a plus
	// d'enum local à faire coïncider avec Stripe, donc plus de mapping à tester —
	// et plus de perte d'information. La raison BRUTE de Stripe part telle quelle
	// dans les métadonnées d'audit, y compris une valeur inconnue de nos libellés
	// (l'ancien mapping l'écrasait en `GENERAL`, ce qui rendait un litige
	// `bank_cannot_process` indistinguable d'un litige réellement « général »).
	it.each([
		"duplicate",
		"fraudulent",
		"subscription_canceled",
		"product_unacceptable",
		"product_not_received",
		"unrecognized",
		"credit_not_processed",
		"general",
		"bank_cannot_process",
	])("should preserve the raw Stripe reason '%s' in the audit metadata", async (stripeReason) => {
		const dispute = makeDispute({ reason: stripeReason as Stripe.Dispute["reason"] });

		await handleDisputeCreated(dispute);

		expect(mockCreateOrderAuditTx.mock.calls[0]![1].metadata).toMatchObject({
			reason: stripeReason,
		});
	});

	it("should attach a stable idempotencyKey to the opening admin alert (LOW-2)", async () => {
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({
			idempotencyKey: "alert:dispute-open:dp_test_1",
		});
	});
});

// ============================================================================
// @regression dispute-lost-accounting-2026-05-29
// Un chargeback PERDU reprend des fonds sur une commande facturée : il doit être
// traité comptablement comme un remboursement (avoir Art. 272-I + e-reporting
// REFUND DGFiP), en miroir de `charge.refunded`. Une régression cassant ce
// câblage = facture stale + agrégat DGFiP surévalué (risque réglementaire).
// ============================================================================

describe("handleDisputeClosed — accounting wiring (regression)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 5000 }));
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
		mockTx.order.update.mockResolvedValue({});
		mockTx.orderHistory.create.mockResolvedValue({});
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-chargeback-1" });
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockVoidInvoice.mockResolvedValue({ kind: "noop", reason: "no-active-invoice" });
		mockIssueCreditNoteForRefund.mockResolvedValue({ kind: "noop", reason: "missing" });
	});

	it("HIGH-1: does NOT void invoice nor issue credit note when won", async () => {
		const dispute = makeDispute({ status: "won" });

		await handleDisputeClosed(dispute);

		expect(mockVoidInvoice).not.toHaveBeenCalled();
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
	});

	it("HIGH-2 (full reclaim): voids the invoice when reclaim covers the full order and invoice is GENERATED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "GENERATED",
			invoiceNumber: "F-2026-00042",
		});
		const dispute = makeDispute({ status: "lost", amount: 5000 }); // total 5000 → full

		await handleDisputeClosed(dispute);

		expect(mockVoidInvoice).toHaveBeenCalledWith(
			expect.objectContaining({ orderId: "order-1", source: "WEBHOOK" }),
		);
		// Full reclaim → l'avoir canonique est porté par voidInvoice, PAS un 2e avoir Refund.
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
	});

	it("HIGH-2 (full reclaim): skips void when no active GENERATED invoice", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "VOIDED",
			invoiceNumber: "F-2026-00042",
		});
		const dispute = makeDispute({ status: "lost", amount: 5000 });

		await handleDisputeClosed(dispute);

		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});

	it("HIGH-2 (partial reclaim): issues a Refund credit note (not a void) when reclaim is partial", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 10000 }));
		const dispute = makeDispute({ status: "lost", amount: 3000 }); // 3000 < 10000 → partiel

		await handleDisputeClosed(dispute);

		expect(mockIssueCreditNoteForRefund).toHaveBeenCalledWith(
			expect.objectContaining({ refundId: "ref-chargeback-1", source: "WEBHOOK" }),
		);
		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});

	it("MEDIUM-2: emits a double-reclaim admin alert when refunds + chargeback exceed the order total", async () => {
		// Déjà remboursé 5000 + chargeback 5000 = 10000 > total 5000 → double reprise.
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
		mockPrisma.order.findFirst.mockResolvedValue(
			makeOrder({ total: 5000, paymentStatus: "REFUNDED" }),
		);
		const dispute = makeDispute({ status: "lost", amount: 5000 });

		const result = await handleDisputeClosed(dispute);

		const alert = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alert).toBeDefined();
		expect(alert?.data).toMatchObject({
			disputeId: "dp_test_1",
			idempotencyKey: "alert:dispute-double-reclaim:dp_test_1",
		});
		expect(alert?.data.reason).toContain("DOUBLE REPRISE DE FONDS");
	});

	it("MEDIUM-2: no double-reclaim alert when refunds + chargeback stay within the order total", async () => {
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		const dispute = makeDispute({ status: "lost", amount: 5000 }); // total 5000, exactement

		const result = await handleDisputeClosed(dispute);

		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
	});
});

// ============================================================================
// NOTE — `charge.dispute.updated` n'est plus traité (retrait du modèle `Dispute`,
// simplification V1 2026-07-30). Le hasard que gardait l'ancien test P2-D — un
// statut terminal livré par `updated` rendant le litige « résolu » AVANT que la
// compta de clôture ait tourné — disparaît STRUCTURELLEMENT : `hasOpenDisputeTx`
// ne bascule que sur un `DISPUTE_RESOLVED`, écrit uniquement par
// `charge.dispute.closed`, dans la MÊME transaction que le Refund et l'avoir.
// ============================================================================

// ============================================================================
// @regression dispute-chargeback-idempotence — P1-3
//
// Complète HIGH-1/HIGH-2 (qui couvrent void/avoir sur litige perdu) :
// sur une REDÉLIVRANCE du webhook charge.dispute.closed (note déjà créée), AUCUNE
// écriture comptable irréversible ne doit être rejouée — ni avoir (voidInvoice /
// issueCreditNoteForRefund). La garde de doublon court-circuite AVANT la transaction (donc avant
// la matérialisation du chargebackRefund). Verrou anti double-reprise de fonds.
// ============================================================================
describe("@regression dispute-chargeback-idempotence — P1-3", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 5000 }));
		// Note déjà créée → redélivrance du webhook.
		mockPrisma.orderHistory.findFirst.mockResolvedValue({ id: "note-existing" });
	});

	it("REDÉLIVRANCE (note déjà créée) → aucun avoir (idempotence)", async () => {
		const result = await handleDisputeClosed(makeDispute({ status: "lost", amount: 5000 }));

		expect(result).toMatchObject({ skipped: true });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(mockTx.refund.create).not.toHaveBeenCalled();
		expect(mockVoidInvoice).not.toHaveBeenCalled();
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
	});
});

// ============================================================================
// @regression idem-dispute-001
//
// Complète P1-3 (redélivrance SÉQUENTIELLE) par le cas CONCURRENT, seul cas qui
// produisait réellement le doublon financier (audit idempotence 2026-07-26, P0) :
// la garde `orderNote.findFirst` vivait HORS transaction, donc deux dispatches
// parallèles du même `charge.dispute.closed` (fenêtre route/cron sur un event
// FAILED) la passaient tous deux et créaient 2 `Refund` COMPLETED → 2 numéros
// d'avoir `A-YYYY` (le lock avoir est scopé AU REFUND, il ne peut pas dédupliquer)
// + 2 lignes e-reporting REFUND (`@@unique([refundId, type])` ne voit que des
// refundId distincts) pour UNE SEULE reprise de fonds Stripe.
//
// La garde est désormais rejouée DANS la transaction, après un
// `SELECT … FOR UPDATE` sur la ligne Order qui sérialise les concurrents.
// Le perdant doit sortir sans AUCUNE écriture comptable.
// ============================================================================
describe("@regression idem-dispute-001", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 5000 }));
		// Fast path franchi : au moment de la lecture hors-verrou, rien n'existait.
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-chargeback-1" });
	});

	it("CONCURRENT (note apparue sous le verrou) → aucun Refund, aucun avoir, aucune ligne DGFiP", async () => {
		// Le dispatch concurrent a commité pendant qu'on attendait le FOR UPDATE.
		mockTx.orderHistory.findFirst.mockResolvedValue({ id: "note-committed-by-winner" });

		const result = await handleDisputeClosed(makeDispute({ status: "lost", amount: 5000 }));

		expect(result).toMatchObject({ skipped: true });
		// La transaction a bien été ouverte (contrairement au cas séquentiel P1-3)…
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		// …mais la garde sous verrou a tout arrêté avant la moindre écriture.
		expect(mockTx.refund.create).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockVoidInvoice).not.toHaveBeenCalled();
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
	});

	it("sérialise sur la ligne Order (SELECT … FOR UPDATE) avant de décider", async () => {
		mockTx.orderHistory.findFirst.mockResolvedValue(null);

		await handleDisputeClosed(makeDispute({ status: "lost", amount: 5000 }));

		expect(mockTx.$queryRaw).toHaveBeenCalled();
		const sql = mockTx.$queryRaw.mock.calls[0]?.[0]?.join?.("?") ?? "";
		expect(sql).toContain('FROM "Order"');
		expect(sql).toContain("FOR UPDATE");
	});

	it("GAGNANT (aucune note sous le verrou) → book normalement le chargeback", async () => {
		mockTx.orderHistory.findFirst.mockResolvedValue(null);

		const result = await handleDisputeClosed(makeDispute({ status: "lost", amount: 5000 }));

		expect(result).toMatchObject({ success: true });
		expect(result).not.toMatchObject({ skipped: true });
		expect(mockTx.refund.create).toHaveBeenCalledTimes(1);
	});

	it("handleDisputeCreated : audit apparu sous le verrou → pas de 2ᵉ entrée ni 2ᵉ alerte", async () => {
		mockTx.orderHistory.findFirst.mockResolvedValue({ id: "audit-committed-by-winner" });

		const result = await handleDisputeCreated(makeDispute());

		expect(result).toMatchObject({ skipped: true });
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
		expect(result?.tasks).toBeUndefined();
	});
});
