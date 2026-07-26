import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockRender, mockArchive } = vi.hoisted(() => ({
	mockPrisma: { refund: { findUnique: vi.fn() } },
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockRender: vi.fn(),
	mockArchive: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../render-refund-credit-note.service", () => ({
	renderRefundCreditNotePdf: mockRender,
}));
vi.mock("../archive-credit-note-pdf.service", () => ({
	archiveCreditNotePdf: mockArchive,
}));

import { ensureRefundCreditNoteArchived } from "../ensure-credit-note-archived.service";

/**
 * EINV-CREDIT-020 — archivage eager de l'avoir partiel (Refund). Symétrie du
 * service Order : idempotent, best-effort, purge 10 ans respectée via l'Order
 * parent.
 */
describe("ensureRefundCreditNoteArchived", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns not-applicable when the refund does not exist or has no credit note", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);
		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("not-applicable");

		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: null,
			creditNotePdfUrl: null,
			order: { piiPurgedAt: null },
		});
		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("not-applicable");
	});

	it("returns not-applicable after the parent order's 10-year PII purge", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00002",
			creditNotePdfUrl: null,
			order: { piiPurgedAt: new Date("2036-06-01") },
		});
		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("not-applicable");
		expect(mockRender).not.toHaveBeenCalled();
	});

	it("returns already-archived without re-rendering (idempotent)", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00002",
			creditNotePdfUrl: "https://utfs.io/f/abc.pdf",
			order: { piiPurgedAt: null },
		});
		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("already-archived");
		expect(mockRender).not.toHaveBeenCalled();
	});

	it("renders through the shared SSOT then archives", async () => {
		const pdf = new ArrayBuffer(8);
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00002",
			creditNotePdfUrl: null,
			order: { piiPurgedAt: null },
		});
		mockRender.mockResolvedValue({
			pdfBuffer: pdf,
			creditNoteNumber: "A-2026-00002",
			orderId: "order-1",
		});
		mockArchive.mockResolvedValue({
			creditNotePdfUrl: "https://utfs.io/f/new.pdf",
			creditNotePdfHash: "hash",
		});

		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("archived");
		expect(mockRender).toHaveBeenCalledWith("refund-1");
		expect(mockArchive).toHaveBeenCalledWith("refund-1", "A-2026-00002", pdf);
	});

	it("returns failed on render impossibility or upload failure", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00002",
			creditNotePdfUrl: null,
			order: { piiPurgedAt: null },
		});
		mockRender.mockResolvedValue(null);
		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("failed");

		mockRender.mockResolvedValue({
			pdfBuffer: new ArrayBuffer(8),
			creditNoteNumber: "A-2026-00002",
			orderId: "order-1",
		});
		mockArchive.mockResolvedValue(null);
		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("failed");
	});

	it("never throws — a Prisma error resolves to failed (best-effort contract)", async () => {
		mockPrisma.refund.findUnique.mockRejectedValue(new Error("db down"));
		expect(await ensureRefundCreditNoteArchived("refund-1")).toBe("failed");
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
