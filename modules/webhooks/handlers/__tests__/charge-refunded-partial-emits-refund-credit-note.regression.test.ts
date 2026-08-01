/**
 * @regression charge-refunded-partial-emits-refund-credit-note
 *
 * Garde Art. 272-I CGI : **TOUT remboursement** (partiel OU total) sur une
 * facture émise doit faire l'objet d'un avoir comptable séquentiel.
 *
 *   - Refund TOTAL → `voidInvoice()` écrit `Order.creditNoteNumber` +
 *     `Order.invoiceStatus = VOIDED` (full void historique, EINV-COMPLY-003).
 *   - Refund PARTIEL → `issueCreditNoteForRefund()` écrit
 *     `Refund.creditNoteNumber`. La facture reste GENERATED (valide pour la
 *     part non remboursée). EINV-CREDIT-001 (2026-05-28).
 *
 * Ce test verrouille l'invariant EINV-CREDIT-001 affiné par EINV-SEQ-001
 * (audit séquences 2026-05-28, Option A) :
 *   - refund PARTIEL → `issueCreditNoteForRefund` appelé pour chaque Refund
 *     COMPLETED sans `creditNoteNumber` (re-fetch post syncStripeRefunds).
 *   - refund TOTAL → `voidInvoice` est l'émetteur UNIQUE de l'avoir
 *     (`Order.creditNoteNumber`) ; `issueCreditNoteForRefund` n'est PAS appelé,
 *     sinon deux numéros A-YYYY seraient consommés pour un seul remboursement
 *     (avoir fictif, Art. 272-I/286 CGI).
 *
 * Ancien invariant (« partial NE GÉNÈRE PAS d'avoir », EINV-TEST-008) :
 * désormais factuellement faux, ce test remplace le précédent
 * `charge-refunded-partial-no-credit-note.regression.test.ts` qui passait
 * « green for the wrong reason » (ne mockait pas issueCreditNoteForRefund).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockSyncStripeRefunds,
	mockUpdateOrderPaymentStatus,
	mockResolveRefundByStripeId,
	mockMapStripeRefundStatus,
	mockUpdateRefundStatus,
	mockMarkRefundAsFailed,
	mockGetBaseUrl,
	mockVoidInvoice,
	mockIssueCreditNoteForRefund,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
		},
		refund: {
			findMany: vi.fn(),
			findFirst: vi.fn().mockResolvedValue(null),
			// ORD-REFUND-AUDIT-007 : lookup Refund local par stripeRefundId pour
			// aligner l'idempotencyKey email. Null par défaut → fallback charge-based.
			findUnique: vi.fn().mockResolvedValue(null),
			// EINV-CREDIT-015 : détection sur-crédit après void total. 0 par défaut.
			count: vi.fn().mockResolvedValue(0),
		},
	},
	mockSyncStripeRefunds: vi.fn(),
	mockUpdateOrderPaymentStatus: vi.fn(),
	mockResolveRefundByStripeId: vi.fn(),
	mockMapStripeRefundStatus: vi.fn(),
	mockUpdateRefundStatus: vi.fn(),
	mockMarkRefundAsFailed: vi.fn(),
	mockGetBaseUrl: vi.fn(),
	mockVoidInvoice: vi.fn(),
	mockIssueCreditNoteForRefund: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("../../services/refund.service", () => ({
	syncStripeRefunds: mockSyncStripeRefunds,
	updateOrderPaymentStatus: mockUpdateOrderPaymentStatus,
	resolveRefundByStripeId: mockResolveRefundByStripeId,
	mapStripeRefundStatus: mockMapStripeRefundStatus,
	updateRefundStatus: mockUpdateRefundStatus,
	markRefundAsFailed: mockMarkRefundAsFailed,
}));

vi.mock("@/modules/orders/constants/cache", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("@/modules/orders/constants/cache")>();
	return actual;
});

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges", ADMIN_ORDERS_LIST: "admin-orders-list" },
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	// `buildUrl` + `SHOP.ORDER_TRACKING` : requis depuis que le lien client passe
	// par `buildOrderTrackingUrl` (retrait de l'espace client 2026-07-31) — un mock
	// sans eux fait échouer le module à l'import, pas à l'assertion.
	buildUrl: (path: string) => `https://synclune.fr${path}`,
	ROUTES: {
		SHOP: { ORDER_TRACKING: "/suivi-commande" },
		ADMIN: { REFUNDS: "/admin/ventes/remboursements" },
	},
}));

vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

vi.mock("@/modules/refunds/services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: mockIssueCreditNoteForRefund,
}));

import type Stripe from "stripe";
import { handleChargeRefunded } from "../refund-handlers";

const ORDER_TOTAL = 10000;
const ORDER_ID = "order-partial-1";
const INVOICE_NUMBER = "F-2026-09001";

function makeCharge(overrides: Record<string, unknown> = {}) {
	return {
		id: "ch_partial_001",
		payment_intent: "pi_partial_001",
		amount_refunded: 2000,
		refunds: { data: [{ id: "re_partial_1", reason: "requested_by_customer" }] },
		...overrides,
	} as unknown as Stripe.Charge;
}

function makeOrderWithInvoice(overrides: Record<string, unknown> = {}) {
	return {
		id: ORDER_ID,
		orderNumber: "SYN-2026-9001",
		total: ORDER_TOTAL,
		paymentStatus: "PAID",
		customerEmail: "client@example.com",
		customerName: "Marie",
		userId: "user-1",
		refunds: [],
		...overrides,
	};
}

describe("@regression charge-refunded-partial-emits-refund-credit-note — EINV-CREDIT-001", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		// ORD-STRIPE-006 : syncStripeRefunds retourne maintenant { dashboardRefundsCreated }
		mockSyncStripeRefunds.mockResolvedValue({ dashboardRefundsCreated: [] });
		mockIssueCreditNoteForRefund.mockResolvedValue({
			kind: "issued",
			creditNoteNumber: "A-2026-00042",
			creditNoteGeneratedAt: new Date(),
		});
		// Pas de refund.findUnique sur Order pour les paths email — par défaut
		// les tests ne déclenchent pas le path email (customerEmail mocké à part).
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "GENERATED",
			invoiceNumber: INVOICE_NUMBER,
		});
	});

	describe("refund partiel — invariant : voidInvoice OFF + issueCreditNoteForRefund ON", () => {
		it("partial 20%: voidInvoice NOT called, issueCreditNoteForRefund called pour chaque Refund COMPLETED sans creditNoteNumber", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeOrderWithInvoice());
			mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });
			mockPrisma.refund.findMany.mockResolvedValue([{ id: "refund-1" }]);

			await handleChargeRefunded(makeCharge({ amount_refunded: 2000 }));

			expect(mockVoidInvoice).not.toHaveBeenCalled();
			expect(mockIssueCreditNoteForRefund).toHaveBeenCalledTimes(1);
			expect(mockIssueCreditNoteForRefund).toHaveBeenCalledWith(
				expect.objectContaining({
					refundId: "refund-1",
					source: "WEBHOOK",
					authorName: "Stripe",
				}),
			);
		});

		it("partial 99%: voidInvoice toujours NOT called (full void réservé à amount_refunded === total)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeOrderWithInvoice({ total: 10000 }));
			mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });
			mockPrisma.refund.findMany.mockResolvedValue([{ id: "refund-2" }]);

			await handleChargeRefunded(makeCharge({ amount_refunded: 9900 }));

			expect(mockVoidInvoice).not.toHaveBeenCalled();
			expect(mockIssueCreditNoteForRefund).toHaveBeenCalledTimes(1);
		});

		it("2 refunds COMPLETED partiels sans creditNoteNumber → 2 appels issueCreditNoteForRefund (par ID)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeOrderWithInvoice());
			mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });
			mockPrisma.refund.findMany.mockResolvedValue([{ id: "refund-A" }, { id: "refund-B" }]);

			await handleChargeRefunded(makeCharge());

			expect(mockIssueCreditNoteForRefund).toHaveBeenCalledTimes(2);
			expect(mockIssueCreditNoteForRefund).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ refundId: "refund-A" }),
			);
			expect(mockIssueCreditNoteForRefund).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ refundId: "refund-B" }),
			);
		});

		it("aucun Refund COMPLETED sans creditNoteNumber → issueCreditNoteForRefund NOT called (idempotence)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeOrderWithInvoice());
			mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });
			mockPrisma.refund.findMany.mockResolvedValue([]); // tous les refunds ont déjà un creditNoteNumber

			await handleChargeRefunded(makeCharge());

			expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});
	});

	describe("query filter — ne sélectionne que COMPLETED + creditNoteNumber=null", () => {
		it("refund.findMany filtre status=COMPLETED ET creditNoteNumber=null (anti double avoir)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeOrderWithInvoice());
			mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });
			mockPrisma.refund.findMany.mockResolvedValue([]);

			await handleChargeRefunded(makeCharge());

			expect(mockPrisma.refund.findMany).toHaveBeenCalledWith({
				where: {
					orderId: ORDER_ID,
					status: "COMPLETED",
					creditNoteNumber: null,
				},
				select: { id: true },
			});
		});
	});

	describe("refund TOTAL — voidInvoice est l'émetteur UNIQUE (EINV-SEQ-001, Option A)", () => {
		it("refund total avec facture GENERATED → voidInvoice appelé 1× et issueCreditNoteForRefund JAMAIS (anti double avoir)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeOrderWithInvoice());
			mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });
			mockVoidInvoice.mockResolvedValue({
				kind: "voided",
				creditNoteNumber: "A-2026-00043",
				creditNoteGeneratedAt: new Date(),
				invoiceVoidedAt: new Date(),
			});
			mockPrisma.refund.findMany.mockResolvedValue([{ id: "refund-full" }]);

			await handleChargeRefunded(makeCharge({ amount_refunded: 10000 }));

			// EINV-SEQ-001 : sur un refund TOTAL, voidInvoice (Order.creditNoteNumber)
			// est l'avoir canonique unique. issueCreditNoteForRefund ne doit PAS être
			// appelé — sinon deux numéros A-YYYY consommés pour un seul remboursement.
			expect(mockVoidInvoice).toHaveBeenCalledTimes(1);
			expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
			// L'étape 4c (émission avoir par Refund, filtre creditNoteNumber:null) est
			// court-circuitée pour le total — voidInvoice reste l'émetteur unique.
			// NB : l'étape 4d (e-reporting REFUND) appelle findMany avec un filtre
			// distinct (status COMPLETED, sans creditNoteNumber:null) — légitime et
			// indépendant du flux avoir, donc on cible précisément le filtre 4c.
			expect(mockPrisma.refund.findMany).not.toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ creditNoteNumber: null }),
				}),
			);
		});
	});

	describe("best-effort — échec issueCreditNoteForRefund ne casse pas le webhook", () => {
		it("kind='failed' loggé en warn mais handleChargeRefunded retourne success (cron rattrape)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeOrderWithInvoice());
			mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });
			mockPrisma.refund.findMany.mockResolvedValue([{ id: "refund-fail" }]);
			mockIssueCreditNoteForRefund.mockResolvedValue({
				kind: "failed",
				error: "lock timeout",
			});

			const result = await handleChargeRefunded(makeCharge());

			expect(result.success).toBe(true);
		});
	});
});
