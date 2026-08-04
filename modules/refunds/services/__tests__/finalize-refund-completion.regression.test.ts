/**
 * @regression refund-pending-webhook-finalization
 *
 * P1-C (audit « Admin commandes » 2026-08-01) : un refund Stripe parti en
 * `pending` (virement SEPA…) est finalisé par le webhook `refund.updated`. Ce
 * chemin ne posait que `status: COMPLETED` + `processedAt` — sans avoir
 * Art. 272-I, sans email — et `processedAt` non nul excluait le refund à
 * jamais du cron reconcile-refunds (candidats `processedAt: null`) : avoir
 * manquant, aucune alerte.
 *
 * `finalizeRefundCompletion` est désormais le SEUL chemin de finalisation
 * asynchrone (webhook + tâche Maintenance). Cette suite verrouille son contrat
 * complet : claim atomique, paymentStatus, audit, avoir, voidInvoice sur refund
 * total, email au snapshot customerEmail, et le tag set composé
 * (refund + commande) que l'appelant doit invalider. (Le restock automatique
 * est parti au Lot 6 avec `RefundItem.restock` — la finalisation ne touche
 * plus à l'inventaire.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockCreateOrderAuditTx,
	mockVoidInvoice,
	mockIssueCreditNote,
	mockSendRefundConfirmationOnce,
} = vi.hoisted(() => ({
	mockPrisma: {
		refund: {
			findUnique: vi.fn(),
			updateMany: vi.fn(),
			aggregate: vi.fn(),
		},
		order: { update: vi.fn(), findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
	mockCreateOrderAuditTx: vi.fn(),
	mockVoidInvoice: vi.fn(),
	mockIssueCreditNote: vi.fn(),
	mockSendRefundConfirmationOnce: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));
vi.mock("../issue-credit-note.service", () => ({
	issueCreditNoteForRefund: mockIssueCreditNote,
}));
vi.mock("../send-refund-confirmation.service", () => ({
	sendRefundConfirmationOnce: mockSendRefundConfirmationOnce,
}));
vi.mock("@/modules/orders/utils/build-order-tracking-url", () => ({
	buildOrderTrackingUrl: vi.fn(() => "https://synclune.fr/suivi-commande?t=x"),
}));
vi.mock("next/cache", () => ({
	updateTag: vi.fn(),
	revalidateTag: vi.fn(),
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
	captureException: vi.fn(),
	withScope: (
		cb: (s: {
			setLevel: () => void;
			setTag: () => void;
			setFingerprint: () => void;
			setContext: () => void;
		}) => void,
	) => cb({ setLevel: () => {}, setTag: () => {}, setFingerprint: () => {}, setContext: () => {} }),
}));

import { finalizeRefundCompletion } from "../finalize-refund.service";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { getRefundInvalidationTags } from "../../constants/cache";

const REFUND = {
	id: "refund-1",
	amount: 2000,
	reason: "CUSTOMER_REQUEST",
	stripeRefundId: "re_pending_1",
	order: {
		id: "order-1",
		orderNumber: "SYN-2026-0042",
		total: 5000,
		customerEmail: "marie@example.com",
		customerName: "Marie Dupont",
	},
};

describe("@regression refund-pending-webhook-finalization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.refund.findUnique.mockImplementation(async (args: any) => {
			if (args?.select?.order?.select?.customerEmail) return REFUND;
			if (args?.select?.creditNoteNumber) {
				return {
					creditNoteNumber: "A-2026-00009",
					order: { invoiceNumber: "F-2026-00021", creditNoteNumber: null },
				};
			}
			return null;
		});
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
		mockPrisma.order.update.mockResolvedValue({});
		mockPrisma.order.findUnique.mockResolvedValue({ invoiceStatus: null, invoiceNumber: null });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
			fn(mockPrisma),
		);
		mockIssueCreditNote.mockResolvedValue({ kind: "issued", creditNoteNumber: "A-2026-00009" });
		mockVoidInvoice.mockResolvedValue({ kind: "voided", creditNoteNumber: "A-2026-00010" });
		mockSendRefundConfirmationOnce.mockResolvedValue({ sent: true });
	});

	it("finalise TOUT : claim, paymentStatus, audit, avoir, email", async () => {
		const outcome = await finalizeRefundCompletion({
			refundId: "refund-1",
			source: "WEBHOOK" as never,
			authorName: "Système (webhook Stripe)",
			auditNote: "Refund completed via Stripe webhook (status: succeeded)",
		});

		expect(outcome.finalized).toBe(true);

		// Claim atomique (guard TOCTOU)
		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "refund-1", status: "APPROVED" },
			data: expect.objectContaining({ status: "COMPLETED", processedAt: expect.any(Date) }),
		});
		// paymentStatus recalculé (2000/5000 → partiel)
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "PARTIALLY_REFUNDED" },
		});
		// Audit L123-22 avec la source de l'appelant
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({ action: "REFUND_COMPLETED", source: "WEBHOOK" }),
		);
		// Avoir Art. 272-I
		expect(mockIssueCreditNote).toHaveBeenCalledWith(
			expect.objectContaining({ refundId: "refund-1" }),
		);
		// Email au snapshot customerEmail (achat invité), avec les numéros de pièces
		expect(mockSendRefundConfirmationOnce).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "marie@example.com",
				creditNoteNumber: "A-2026-00009",
				invoiceNumber: "F-2026-00021",
			}),
		);
	});

	it("retourne le tag set composé refund + commande (l'appelant invalide)", async () => {
		const outcome = await finalizeRefundCompletion({
			refundId: "refund-1",
			source: "SYSTEM" as never,
			authorName: "Système (reconcile-refunds)",
			auditNote: "Refund completed via Stripe DLQ reconciliation",
		});

		for (const tag of getRefundInvalidationTags("refund-1", "order-1")) {
			expect(outcome.tags).toContain(tag);
		}
		for (const tag of getOrderInvalidationTags("order-1")) {
			expect(outcome.tags).toContain(tag);
		}
		expect(outcome.tags.every((t) => typeof t === "string" && t.length > 0)).toBe(true);
	});

	it("claim perdu (race) → aucun effet de bord, finalized: false", async () => {
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });

		const outcome = await finalizeRefundCompletion({
			refundId: "refund-1",
			source: "WEBHOOK" as never,
			authorName: "Système (webhook Stripe)",
			auditNote: "n/a",
		});

		expect(outcome).toMatchObject({ finalized: false, tags: [] });
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockIssueCreditNote).not.toHaveBeenCalled();
		expect(mockSendRefundConfirmationOnce).not.toHaveBeenCalled();
	});

	it("refund TOTAL + facture GENERATED → voidInvoice fallback", async () => {
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "GENERATED",
			invoiceNumber: "F-2026-00021",
		});

		const outcome = await finalizeRefundCompletion({
			refundId: "refund-1",
			source: "WEBHOOK" as never,
			authorName: "Système (webhook Stripe)",
			auditNote: "n/a",
		});

		expect(outcome.isFullyRefunded).toBe(true);
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});
		expect(mockVoidInvoice).toHaveBeenCalledWith(expect.objectContaining({ orderId: "order-1" }));
	});
});
