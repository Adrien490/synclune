import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @regression einv-seq-001-full-refund-single-avoir
 *
 * EINV-SEQ-001 (Option A) — garde centralisée : sur un remboursement TOTAL,
 * l'avoir canonique est porté par `voidInvoice` sur `Order.creditNoteNumber`.
 * `issueCreditNoteForRefund` NE DOIT PAS poser de second avoir sur le Refund,
 * sinon deux numéros A-YYYY sont consommés pour un seul événement (avoir fictif,
 * Art. 272-I / 286 CGI).
 *
 * La garde vit DANS le service (et non seulement chez les appelants) pour couvrir
 * `process-refund` (admin Stripe) et `reconcile-refunds` (cron DLQ) qui appelaient
 * sans `!isFullyRefunded` :
 *   - `paymentStatus === REFUNDED` attrape l'ordre process-refund → webhook void.
 *   - `invoiceStatus === VOIDED`  attrape l'ordre cancel-order → refund Stripe.
 *
 * Un refund PARTIEL reste émis sur `Refund.creditNoteNumber` (inchangé).
 */

const {
	mockPrisma,
	mockUpdateTag,
	mockCreateOrderAuditTx,
	mockLogger,
	mockGetOrderInvalidationTags,
	mockSendAdminSequenceOverflowAlert,
	mockNextCreditNoteNumberTx,
} = vi.hoisted(() => ({
	mockPrisma: { $transaction: vi.fn() },
	mockUpdateTag: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	mockGetOrderInvalidationTags: vi.fn(() => ["tag-order-1"]),
	mockSendAdminSequenceOverflowAlert: vi.fn(),
	mockNextCreditNoteNumberTx: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => {
	class FakePrismaClientKnownRequestError extends Error {
		code: string;
		constructor(message: string, opts: { code: string }) {
			super(message);
			this.code = opts.code;
			Object.setPrototypeOf(this, FakePrismaClientKnownRequestError.prototype);
		}
	}
	return {
		Prisma: { PrismaClientKnownRequestError: FakePrismaClientKnownRequestError },
		HistorySource: { ADMIN: "ADMIN", WEBHOOK: "WEBHOOK", SYSTEM: "SYSTEM", CUSTOMER: "CUSTOMER" },
		OrderAction: { CREDIT_NOTE_GENERATED: "CREDIT_NOTE_GENERATED" },
		RefundStatus: {
			PENDING: "PENDING",
			APPROVED: "APPROVED",
			COMPLETED: "COMPLETED",
			FAILED: "FAILED",
			REJECTED: "REJECTED",
			CANCELLED: "CANCELLED",
		},
		PaymentStatus: {
			PENDING: "PENDING",
			PAID: "PAID",
			PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
			REFUNDED: "REFUNDED",
			FAILED: "FAILED",
		},
		InvoiceStatus: { PENDING: "PENDING", GENERATED: "GENERATED", VOIDED: "VOIDED" },
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../constants/cache", () => ({
	REFUNDS_CACHE_TAGS: { DETAIL: (id: string) => `refunds-detail-${id}` },
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminSequenceOverflowAlert: mockSendAdminSequenceOverflowAlert,
}));
vi.mock("@/modules/invoices/services/credit-note-sequence.service", () => ({
	nextCreditNoteNumberTx: mockNextCreditNoteNumberTx,
}));

import { issueCreditNoteForRefund } from "../issue-credit-note.service";

interface FakeTx {
	refund: { update: ReturnType<typeof vi.fn> };
	$executeRaw: ReturnType<typeof vi.fn>;
	$queryRaw: ReturnType<typeof vi.fn>;
}

function makeTx(): FakeTx {
	return {
		refund: { update: vi.fn() },
		$executeRaw: vi.fn(),
		$queryRaw: vi.fn(),
	};
}

const AUTHOR = { source: "WEBHOOK" as const, authorId: null, authorName: "Stripe" };

/** Branche `prisma.$transaction` pour exécuter le callback avec un tx donné. */
function wireTx(tx: FakeTx, refundFindUnique: ReturnType<typeof vi.fn>): void {
	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
			fn({ ...tx, refund: { ...tx.refund, findUnique: refundFindUnique } } as Record<
				string,
				unknown
			>),
	);
}

describe("@regression einv-seq-001-full-refund-single-avoir", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("paymentStatus REFUNDED (remboursement total) → noop, aucun numéro consommé", async () => {
		const tx = makeTx();
		const findUnique = vi.fn().mockResolvedValue({
			id: "refund-full",
			orderId: "order-1",
			amount: 10000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-1",
				userId: "user-1",
				invoiceNumber: "F-2026-00010",
				invoiceStatus: "GENERATED",
				paymentStatus: "REFUNDED",
			},
		});
		wireTx(tx, findUnique);

		const result = await issueCreditNoteForRefund({ refundId: "refund-full", ...AUTHOR });

		expect(result.kind).toBe("noop");
		if (result.kind !== "noop") throw new Error("expected noop");
		expect(result.reason).toBe("full-refund-voided-on-order");
		// Invariant clé : aucun avoir posé sur le Refund, aucune séquence consommée.
		expect(tx.refund.update).not.toHaveBeenCalled();
		expect(mockNextCreditNoteNumberTx).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("invoiceStatus VOIDED (cancel-order déjà voidé) → noop, aucun numéro consommé", async () => {
		const tx = makeTx();
		const findUnique = vi.fn().mockResolvedValue({
			id: "refund-after-void",
			orderId: "order-2",
			amount: 8000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-2",
				userId: "user-2",
				invoiceNumber: "F-2026-00020",
				invoiceStatus: "VOIDED",
				paymentStatus: "PARTIALLY_REFUNDED",
			},
		});
		wireTx(tx, findUnique);

		const result = await issueCreditNoteForRefund({ refundId: "refund-after-void", ...AUTHOR });

		expect(result.kind).toBe("noop");
		if (result.kind !== "noop") throw new Error("expected noop");
		expect(result.reason).toBe("full-refund-voided-on-order");
		expect(tx.refund.update).not.toHaveBeenCalled();
		expect(mockNextCreditNoteNumberTx).not.toHaveBeenCalled();
	});

	it("refund PARTIEL (PARTIALLY_REFUNDED + facture GENERATED) → émet l'avoir sur le Refund (inchangé)", async () => {
		const tx = makeTx();
		tx.refund.update.mockResolvedValue({
			creditNoteNumber: "A-2026-00007",
			creditNoteGeneratedAt: new Date(),
		});
		mockNextCreditNoteNumberTx.mockResolvedValue("A-2026-00007");
		const findUnique = vi.fn().mockResolvedValue({
			id: "refund-partial",
			orderId: "order-3",
			amount: 3000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-3",
				userId: "user-3",
				invoiceNumber: "F-2026-00030",
				invoiceStatus: "GENERATED",
				paymentStatus: "PARTIALLY_REFUNDED",
			},
		});
		wireTx(tx, findUnique);

		const result = await issueCreditNoteForRefund({ refundId: "refund-partial", ...AUTHOR });

		expect(result.kind).toBe("issued");
		if (result.kind !== "issued") throw new Error("expected issued");
		expect(result.creditNoteNumber).toBe("A-2026-00007");
		expect(mockNextCreditNoteNumberTx).toHaveBeenCalledTimes(1);
		expect(tx.refund.update).toHaveBeenCalledTimes(1);
	});
});
