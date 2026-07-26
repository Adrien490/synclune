import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @regression idem-pdf-001-archive-claim
 *
 * Audit idempotence 2026-07-02 (P2-2) — double archivage PDF facture.
 *
 * Bug verrouillé : le check d'existence (`invoicePdfUrl`) était une lecture
 * isolée HORS transaction. Une course archivage eager (webhook) vs lazy (route
 * download) vs Passe 2 du cron reconcile-invoices lisait deux fois `null`,
 * uploadait DEUX fichiers UploadThing, écrasait la colonne (last-write-wins)
 * et doublait l'audit INVOICE_ARCHIVED (Art. L123-22).
 *
 * Fix : claim `updateMany({id, invoicePdfUrl: null})` ré-évalué au lock de
 * ligne — un seul archiveur gagne ; le perdant supprime son upload orphelin,
 * n'émet PAS d'audit, et sert l'archive gagnante.
 */

const { mockPrisma, mockUtapi, mockLogger, mockCreateOrderAuditTx, mockCreateOrderAudit } =
	vi.hoisted(() => ({
		mockPrisma: {
			order: {
				findUnique: vi.fn(),
				update: vi.fn(),
				updateMany: vi.fn(),
			},
			orderHistory: { create: vi.fn() },
			$transaction: vi.fn(),
		},
		mockUtapi: {
			uploadFiles: vi.fn(),
			deleteFiles: vi.fn(),
		},
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockCreateOrderAuditTx: vi.fn(),
		mockCreateOrderAudit: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/uploadthing", () => ({ utapi: mockUtapi }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminPdfArchiveFailedAlert: vi.fn(),
}));

import { archiveInvoicePdf } from "../archive-invoice-pdf.service";

const sampleBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

describe("@regression IDEM-PDF-001 — claim conditionnel sur l'archivage facture", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) =>
			cb(mockPrisma),
		);
		mockUtapi.deleteFiles.mockResolvedValue({ success: true });
	});

	it("claim PERDU (archiveur concurrent) : upload orphelin supprimé, archive gagnante servie, AUCUN audit", async () => {
		// Pré-check hors tx : pas encore archivé (les deux archiveurs voient null).
		mockPrisma.order.findUnique
			.mockResolvedValueOnce({ invoicePdfUrl: null, invoicePdfHash: null })
			// Re-fetch post-claim-perdu : l'archive du gagnant.
			.mockResolvedValueOnce({
				invoicePdfUrl: "https://ufs.example/winner.pdf",
				invoicePdfHash: "c".repeat(64),
			});
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/loser.pdf", key: "loser-key" } },
		]);
		// Le gagnant a posé invoicePdfUrl entre notre pré-check et notre claim.
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await archiveInvoicePdf("order-1", "F-2026-00001", sampleBytes);

		// Le fichier uploadé en double est nettoyé (best-effort).
		expect(mockUtapi.deleteFiles).toHaveBeenCalledWith(["loser-key"]);
		// Pas de 2ᵉ audit INVOICE_ARCHIVED.
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
		// On sert l'archive du gagnant (immuabilité L102 B préservée).
		expect(result).toEqual({
			invoicePdfUrl: "https://ufs.example/winner.pdf",
			invoicePdfHash: "c".repeat(64),
		});
	});

	it("claim GAGNÉ : archive posée via updateMany conditionnel + audit unique", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({ invoicePdfUrl: null, invoicePdfHash: null });
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/inv.pdf", key: "key-1" } },
		]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

		const result = await archiveInvoicePdf("order-1", "F-2026-00001", sampleBytes);

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1", OR: [{ invoicePdfUrl: null }, { invoicePdfHash: null }] },
			}),
		);
		expect(mockUtapi.deleteFiles).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
		expect(result?.invoicePdfUrl).toBe("https://ufs.example/inv.pdf");
	});
});
