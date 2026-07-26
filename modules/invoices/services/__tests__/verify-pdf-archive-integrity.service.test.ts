import { createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockLogger,
	mockUtapi,
	mockDeleteFromUrl,
	mockSendAlert,
	mockRenderInvoicePdf,
	mockResolveInvoiceData,
	mockRenderOrderCreditNote,
	mockRenderRefundCreditNote,
	mockCreateOrderAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
		refund: { findMany: vi.fn(), update: vi.fn() },
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockUtapi: { uploadFiles: vi.fn(), deleteFiles: vi.fn() },
	mockDeleteFromUrl: vi.fn().mockResolvedValue(undefined),
	mockSendAlert: vi.fn().mockResolvedValue(undefined),
	mockRenderInvoicePdf: vi.fn(),
	mockResolveInvoiceData: vi.fn(),
	mockRenderOrderCreditNote: vi.fn(),
	mockRenderRefundCreditNote: vi.fn(),
	mockCreateOrderAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/shared/lib/uploadthing", () => ({ utapi: mockUtapi }));
vi.mock("@/shared/lib/media-validation", () => ({ isAllowedMediaDomain: () => true }));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFileFromUrl: mockDeleteFromUrl,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAlert,
}));
vi.mock("../render-invoice-pdf", () => ({ renderInvoicePdf: mockRenderInvoicePdf }));
vi.mock("../resolve-invoice-data", () => ({ resolveInvoiceDataForRender: mockResolveInvoiceData }));
vi.mock("@/modules/orders/services/render-order-credit-note.service", () => ({
	renderOrderCreditNotePdf: mockRenderOrderCreditNote,
}));
vi.mock("@/modules/refunds/services/render-refund-credit-note.service", () => ({
	renderRefundCreditNotePdf: mockRenderRefundCreditNote,
}));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
}));
vi.mock("@/modules/orders/constants/order.constants", () => ({
	GET_ORDER_SELECT_ADMIN: { id: true },
}));
vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
	withScope: vi.fn(),
}));

import { verifyPdfArchiveIntegrity } from "../verify-pdf-archive-integrity.service";

const GOOD_BYTES = new Uint8Array([1, 2, 3, 4]);
const GOOD_HASH = createHash("sha256").update(GOOD_BYTES).digest("hex");
const CORRUPT_BYTES = new Uint8Array([9, 9, 9]);
const DIVERGENT_BYTES = new Uint8Array([5, 5, 5, 5]);

function fetchReturning(bytes: Uint8Array) {
	return vi.fn().mockResolvedValue({
		ok: true,
		arrayBuffer: async () =>
			bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
	});
}

function baseOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-1",
		invoiceNumber: "F-2026-00001",
		invoicePdfUrl: "https://utfs.io/f/inv.pdf",
		invoicePdfHash: GOOD_HASH,
		creditNoteNumber: null,
		creditNotePdfUrl: null,
		creditNotePdfHash: null,
		...overrides,
	};
}

const FAR_DEADLINE = Date.now() + 60_000;

/**
 * Passe 8 de reconcile-invoices (Art. L102 B LPF) — le hash DB est la preuve
 * d'immutabilité : jamais réécrit, la réparation n'est possible QUE
 * bit-identique.
 */
describe("verifyPdfArchiveIntegrity", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.refund.findMany.mockResolvedValue([]);
		mockPrisma.order.findMany.mockResolvedValue([]);
	});

	it("counts a healthy artifact and advances the rotation cursor", async () => {
		vi.stubGlobal("fetch", fetchReturning(GOOD_BYTES));
		mockPrisma.order.findMany.mockResolvedValue([baseOrder()]);

		const report = await verifyPdfArchiveIntegrity(FAR_DEADLINE);

		expect(report).toEqual({ checked: 1, repaired: 0, unrepaired: 0, fetchFailed: 0 });
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: { pdfIntegrityCheckedAt: expect.any(Date) },
			}),
		);
		expect(mockSendAlert).not.toHaveBeenCalled();
	});

	it("repairs a corrupted archive when regeneration is bit-identical — hash never rewritten", async () => {
		vi.stubGlobal("fetch", fetchReturning(CORRUPT_BYTES));
		mockPrisma.order.findMany.mockResolvedValue([baseOrder()]);
		mockPrisma.order.findUnique.mockResolvedValue({ id: "order-1" });
		mockResolveInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(GOOD_BYTES.buffer);
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/repaired.pdf", key: "repaired" } },
		]);

		const report = await verifyPdfArchiveIntegrity(FAR_DEADLINE);

		expect(report.repaired).toBe(1);
		expect(report.unrepaired).toBe(0);
		// URL remplacée, hash JAMAIS touché.
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { invoicePdfUrl: "https://utfs.io/f/repaired.pdf" },
			}),
		);
		const allUpdatePayloads = mockPrisma.order.update.mock.calls.map(
			(c: Array<{ data: Record<string, unknown> }>) => c[0]!.data,
		);
		for (const payload of allUpdatePayloads) {
			expect(payload).not.toHaveProperty("invoicePdfHash");
		}
		// Copie corrompue supprimée best-effort + audit trail.
		expect(mockDeleteFromUrl).toHaveBeenCalledWith("https://utfs.io/f/inv.pdf");
		expect(mockCreateOrderAudit).toHaveBeenCalled();
		expect(mockSendAlert).not.toHaveBeenCalled();
	});

	it("alerts admin WITHOUT touching anything when regeneration diverges from the stored hash", async () => {
		vi.stubGlobal("fetch", fetchReturning(CORRUPT_BYTES));
		mockPrisma.order.findMany.mockResolvedValue([baseOrder()]);
		mockPrisma.order.findUnique.mockResolvedValue({ id: "order-1" });
		mockResolveInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(DIVERGENT_BYTES.buffer);

		const report = await verifyPdfArchiveIntegrity(FAR_DEADLINE);

		expect(report.unrepaired).toBe(1);
		expect(mockUtapi.uploadFiles).not.toHaveBeenCalled();
		// Curseur NON avancé (re-priorisé au prochain run → alerte quotidienne).
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockSendAlert).toHaveBeenCalledWith(
			expect.objectContaining({ job: "reconcile-invoices:pdf-integrity" }),
		);
	});

	it("treats a fetch failure as transient — no alert, cursor not advanced", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
		mockPrisma.order.findMany.mockResolvedValue([baseOrder()]);

		const report = await verifyPdfArchiveIntegrity(FAR_DEADLINE);

		expect(report).toEqual({ checked: 0, repaired: 0, unrepaired: 0, fetchFailed: 1 });
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockSendAlert).not.toHaveBeenCalled();
	});

	it("verifies Refund partial credit notes through the shared SSOT renderer", async () => {
		vi.stubGlobal("fetch", fetchReturning(CORRUPT_BYTES));
		mockPrisma.refund.findMany.mockResolvedValue([
			{
				id: "refund-1",
				orderId: "order-1",
				creditNoteNumber: "A-2026-00002",
				creditNotePdfUrl: "https://utfs.io/f/cn.pdf",
				creditNotePdfHash: GOOD_HASH,
			},
		]);
		mockRenderRefundCreditNote.mockResolvedValue({
			pdfBuffer: GOOD_BYTES.buffer,
			creditNoteNumber: "A-2026-00002",
			orderId: "order-1",
		});
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/cn-repaired.pdf", key: "k" } },
		]);

		const report = await verifyPdfArchiveIntegrity(FAR_DEADLINE);

		expect(report.repaired).toBe(1);
		expect(mockPrisma.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { creditNotePdfUrl: "https://utfs.io/f/cn-repaired.pdf" },
			}),
		);
	});

	it("never throws even when the initial query explodes", async () => {
		mockPrisma.order.findMany.mockRejectedValue(new Error("db down"));
		const report = await verifyPdfArchiveIntegrity(FAR_DEADLINE);
		expect(report).toEqual({ checked: 0, repaired: 0, unrepaired: 0, fetchFailed: 0 });
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
