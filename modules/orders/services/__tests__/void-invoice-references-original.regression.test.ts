import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @regression EINV-CREDIT-014 (audit avoirs 2026-05-28)
 *
 * Verrouille la traçabilité de la facture originale dans l'audit OrderHistory
 * émis par `voidInvoice()`. Art. 272-I CGI impose qu'un avoir référence
 * explicitement la facture qu'il annule — le metadata.invoiceNumber porte
 * cette référence (en attendant Refund.precedingInvoiceNumber future Phase 2C).
 */

const {
	mockPrisma,
	mockUpdateTag,
	mockCreateOrderAuditTx,
	mockLogger,
	mockGetOrderInvalidationTags,
	mockCreateOrderAudit,
	mockSendAdminCreditNoteFailedAlert,
	mockSendAdminSequenceOverflowAlert,
} = vi.hoisted(() => ({
	mockPrisma: {
		$transaction: vi.fn(),
		order: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	mockGetOrderInvalidationTags: vi.fn(() => ["tag-1", "tag-2"]),
	mockCreateOrderAudit: vi.fn(),
	mockSendAdminCreditNoteFailedAlert: vi.fn(),
	mockSendAdminSequenceOverflowAlert: vi.fn(),
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
		Prisma: {
			PrismaClientKnownRequestError: FakePrismaClientKnownRequestError,
			sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
				strings.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ""), ""),
		},
		HistorySource: { ADMIN: "ADMIN", WEBHOOK: "WEBHOOK", SYSTEM: "SYSTEM", CUSTOMER: "CUSTOMER" },
		OrderAction: { INVOICE_VOIDED: "INVOICE_VOIDED", CREDIT_NOTE_FAILED: "CREDIT_NOTE_FAILED" },
		InvoiceStatus: { PENDING: "PENDING", GENERATED: "GENERATED", VOIDED: "VOIDED" },
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
// Ce service s'execute en contexte route handler (cron/webhook) : il invalide via
// `revalidateTagsInBackground` -> `revalidateTag(tag, { expire: 0 })`, car
// `updateTag` y throw (E872). Les DEUX sont routes vers le meme espion : ce que
// ces tests verifient, c'est QUELS tags sont invalides. Le choix de l'API selon le
// contexte est prouve, lui, sans mock, par
// `test/contract/cache-invalidation-context.contract.test.ts`.
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	revalidateTag: (tag: string) => mockUpdateTag(tag),
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
	createOrderAudit: mockCreateOrderAudit,
}));
vi.mock("../ensure-credit-note-archived.service", () => ({
	ensureOrderCreditNoteArchived: vi.fn().mockResolvedValue("archived"),
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCreditNoteFailedAlert: mockSendAdminCreditNoteFailedAlert,
	sendAdminSequenceOverflowAlert: mockSendAdminSequenceOverflowAlert,
}));

import { voidInvoice } from "../void-invoice.service";

const AUTHOR = {
	authorId: "admin-1",
	authorName: "Alice Admin",
	source: "ADMIN" as const,
	reason: "Annulation après facture",
};

interface FakeTx {
	$executeRaw: ReturnType<typeof vi.fn>;
	$queryRaw: ReturnType<typeof vi.fn>;
	order: {
		findUnique: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};
}

function makeTx(): FakeTx {
	return {
		$executeRaw: vi.fn(),
		$queryRaw: vi.fn().mockResolvedValue([]),
		order: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	} as FakeTx;
}

describe("voidInvoice — Art. 272-I CGI : avoir référence facture originale", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("écrit metadata.invoiceNumber === order.invoiceNumber dans l'audit INVOICE_VOIDED", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue({
			id: "order-original",
			userId: "user-1",
			invoiceNumber: "F-2026-00042",
			invoiceStatus: "GENERATED",
			invoiceVoidedAt: null,
			creditNoteNumber: null,
		});
		tx.$queryRaw.mockResolvedValue([]);
		tx.order.update.mockResolvedValue({
			invoiceVoidedAt: new Date(),
			creditNoteNumber: "A-2026-00001",
			creditNoteGeneratedAt: new Date(),
			userId: "user-1",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "order-original", ...AUTHOR });

		expect(result.kind).toBe("voided");

		// L'assertion clé EINV-CREDIT-014 : metadata.invoiceNumber DOIT porter le
		// numéro de facture originale (lien comptable Art. 272-I CGI).
		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				orderId: "order-original",
				action: "INVOICE_VOIDED",
				metadata: expect.objectContaining({
					invoiceNumber: "F-2026-00042",
					creditNoteNumber: "A-2026-00001",
				}),
			}),
		);
	});

	it("n'émet pas d'audit (donc pas de référence) si pas de facture active", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue({
			id: "order-no-invoice",
			userId: "user-1",
			invoiceNumber: null,
			invoiceStatus: null,
			invoiceVoidedAt: null,
			creditNoteNumber: null,
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "order-no-invoice", ...AUTHOR });

		expect(result.kind).toBe("noop");
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});
});
