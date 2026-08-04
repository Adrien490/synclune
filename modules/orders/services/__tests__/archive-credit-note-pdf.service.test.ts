import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderAction } from "@/app/generated/prisma/client";

const {
	mockPrisma,
	mockUtapi,
	mockLogger,
	mockCreateOrderAuditTx,
	mockCreateOrderAudit,
	mockSendAdminAlert,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findUnique: vi.fn(),
			update: vi.fn().mockResolvedValue({ orderNumber: "SYN-001" }),
			// IDEM-PDF-001 : le success path passe par un claim updateMany conditionnel
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
		},
		orderHistory: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUtapi: {
		uploadFiles: vi.fn(),
	},
	mockLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
	mockCreateOrderAuditTx: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockSendAdminAlert: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/uploadthing", () => ({ utapi: mockUtapi }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCreditNotePdfArchiveFailedAlert: mockSendAdminAlert,
}));

import { archiveCreditNotePdf } from "../archive-credit-note-pdf.service";

const sampleBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

/**
 * @regression credit-note-archive-2026-05-28
 *
 * Verrouille l'archivage immuable du PDF avoir sur UploadThing (Art. L102 B LPF —
 * symétrique à `archiveInvoicePdf`). L'avoir doit être restituable bit-à-bit
 * sur 10 ans au même titre que la facture (Art. 272-I CGI).
 *
 * Étendu 2026-05-29 (F2) : audit trail CREDIT_NOTE_ARCHIVED (Art. L123-22) +
 * flag `invoiceRetryDeferred` + alerte admin sur échec (symétrie facture).
 */
describe("archiveCreditNotePdf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.update.mockResolvedValue({ orderNumber: "SYN-001" });
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		// $transaction exécute le handler avec tx === mockPrisma pour que
		// order.update / createOrderAuditTx soient observés via les mêmes mocks.
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) =>
			cb(mockPrisma),
		);
	});

	it("uploads to UploadThing + persists URL + SHA-256 hash + audit on first call", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/cn-1.pdf", key: "key1" } },
		]);

		const result = await archiveCreditNotePdf("order-1", "A-2026-00001", sampleBytes);

		expect(result?.creditNotePdfUrl).toBe("https://ufs.example/cn-1.pdf");
		expect(result?.creditNotePdfHash).toMatch(/^[a-f0-9]{64}$/);
		// IDEM-PDF-001 : claim conditionnel — le where ré-évalue creditNotePdfUrl null
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1", OR: [{ creditNotePdfUrl: null }, { creditNotePdfHash: null }] },
				data: expect.objectContaining({
					creditNotePdfUrl: "https://ufs.example/cn-1.pdf",
					creditNotePdfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
					invoiceRetryDeferred: false,
				}),
			}),
		);
		// F2 : audit trail CREDIT_NOTE_ARCHIVED émis dans la même tx.
		expect(mockSendAdminAlert).not.toHaveBeenCalled();
	});

	it("is idempotent — returns existing URL/hash without re-uploading or auditing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: "https://ufs.example/existing-cn.pdf",
			creditNotePdfHash: "b".repeat(64),
		});

		const result = await archiveCreditNotePdf("order-2", "A-2026-00002", sampleBytes);

		expect(result).toEqual({
			creditNotePdfUrl: "https://ufs.example/existing-cn.pdf",
			creditNotePdfHash: "b".repeat(64),
		});
		expect(mockUtapi.uploadFiles).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("flags retry + alerts admin when UploadThing returns no ufsUrl", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockUtapi.uploadFiles.mockResolvedValue([{ data: null }]);

		const result = await archiveCreditNotePdf("order-3", "A-2026-00003", sampleBytes);

		expect(result).toBeNull();
		expect(mockLogger.error).toHaveBeenCalled();
		// F2 : flag invoiceRetryDeferred posé + alerte admin.
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { invoiceRetryDeferred: true } }),
		);
		expect(mockSendAdminAlert).toHaveBeenCalledWith(
			expect.objectContaining({ creditNoteNumber: "A-2026-00003" }),
		);
	});

	it("does not throw + flags retry when UploadThing crashes — best-effort archive", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockUtapi.uploadFiles.mockRejectedValue(new Error("UploadThing 502"));

		await expect(archiveCreditNotePdf("order-4", "A-2026-00004", sampleBytes)).resolves.toBeNull();
		expect(mockLogger.error).toHaveBeenCalled();
		expect(mockSendAdminAlert).toHaveBeenCalledWith(
			expect.objectContaining({ creditNoteNumber: "A-2026-00004" }),
		);
	});

	it("accepts ArrayBuffer input (e.g. jsPDF output)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/cn-ab.pdf", key: "key-ab" } },
		]);

		const ab = sampleBytes.buffer.slice(0) as ArrayBuffer;
		const result = await archiveCreditNotePdf("order-5", "A-2026-00005", ab);

		expect(result?.creditNotePdfUrl).toBe("https://ufs.example/cn-ab.pdf");
		expect(result?.creditNotePdfHash).toMatch(/^[a-f0-9]{64}$/);
	});
});
