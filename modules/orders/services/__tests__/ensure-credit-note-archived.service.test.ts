import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockRender, mockArchive } = vi.hoisted(() => ({
	mockPrisma: { order: { findUnique: vi.fn() } },
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockRender: vi.fn(),
	mockArchive: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../render-order-credit-note.service", () => ({
	renderOrderCreditNotePdf: mockRender,
}));
vi.mock("../archive-credit-note-pdf.service", () => ({
	archiveCreditNotePdf: mockArchive,
}));

import { ensureOrderCreditNoteArchived } from "../ensure-credit-note-archived.service";

/**
 * EINV-CREDIT-020 — archivage eager de l'avoir full-void. Le service est le
 * pivot entre voidInvoice (émission), reconcile-invoices (Passe 3b) et la
 * garde pré-anonymisation : il doit être idempotent, best-effort (ne jamais
 * throw) et respecter la purge 10 ans.
 */
describe("ensureOrderCreditNoteArchived", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns not-applicable when the order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("not-applicable");
		expect(mockRender).not.toHaveBeenCalled();
	});

	it("returns not-applicable when no credit note was issued", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNoteNumber: null,
			creditNotePdfUrl: null,
			piiPurgedAt: null,
		});
		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("not-applicable");
	});

	it("returns not-applicable after the 10-year PII purge (document no longer reconstitutable)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00001",
			creditNotePdfUrl: null,
			piiPurgedAt: new Date("2036-06-01"),
		});
		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("not-applicable");
		expect(mockRender).not.toHaveBeenCalled();
	});

	it("returns already-archived without re-rendering when creditNotePdfUrl is set (idempotent)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00001",
			creditNotePdfUrl: "https://utfs.io/f/abc.pdf",
			piiPurgedAt: null,
		});
		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("already-archived");
		expect(mockRender).not.toHaveBeenCalled();
		expect(mockArchive).not.toHaveBeenCalled();
	});

	it("renders through the shared SSOT then archives (bit-identical path)", async () => {
		const pdf = new ArrayBuffer(8);
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00001",
			creditNotePdfUrl: null,
			piiPurgedAt: null,
		});
		mockRender.mockResolvedValue({ pdfBuffer: pdf, creditNoteNumber: "A-2026-00001" });
		mockArchive.mockResolvedValue({
			creditNotePdfUrl: "https://utfs.io/f/new.pdf",
			creditNotePdfHash: "hash",
		});

		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("archived");
		expect(mockRender).toHaveBeenCalledWith("order-1");
		expect(mockArchive).toHaveBeenCalledWith("order-1", "A-2026-00001", pdf);
	});

	it("returns failed when the render is impossible (inconsistent state)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00001",
			creditNotePdfUrl: null,
			piiPurgedAt: null,
		});
		mockRender.mockResolvedValue(null);
		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("failed");
		expect(mockArchive).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("returns failed when the upload fails (archiveCreditNotePdf → null)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00001",
			creditNotePdfUrl: null,
			piiPurgedAt: null,
		});
		mockRender.mockResolvedValue({
			pdfBuffer: new ArrayBuffer(8),
			creditNoteNumber: "A-2026-00001",
		});
		mockArchive.mockResolvedValue(null);
		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("failed");
	});

	it("never throws — a Prisma error resolves to failed (best-effort contract)", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("db down"));
		expect(await ensureOrderCreditNoteArchived("order-1")).toBe("failed");
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
