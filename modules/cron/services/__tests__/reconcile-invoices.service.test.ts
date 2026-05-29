import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockPersistInvoiceNumber,
	mockBackfillInvoiceDataSnapshot,
	mockArchiveInvoicePdf,
	mockVoidInvoice,
	mockBuildInvoiceData,
	mockRenderInvoicePdf,
	mockSendAdminCronFailedAlert,
	mockCreateOrderAudit,
	mockUpdateTag,
	mockLogger,
	mockCheckSequenceContinuity,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
		refund: { findMany: vi.fn() },
	},
	mockPersistInvoiceNumber: vi.fn(),
	mockBackfillInvoiceDataSnapshot: vi.fn(),
	mockArchiveInvoicePdf: vi.fn(),
	mockVoidInvoice: vi.fn(),
	mockBuildInvoiceData: vi.fn(),
	mockRenderInvoicePdf: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockCheckSequenceContinuity: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

vi.mock("@/modules/orders/services/persist-invoice-number.service", () => ({
	persistInvoiceNumber: mockPersistInvoiceNumber,
	backfillInvoiceDataSnapshot: mockBackfillInvoiceDataSnapshot,
}));

vi.mock("@/modules/orders/services/archive-invoice-pdf.service", () => ({
	archiveInvoicePdf: mockArchiveInvoicePdf,
}));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

vi.mock("@/modules/invoices/services/build-invoice-data", () => ({
	buildInvoiceData: mockBuildInvoiceData,
}));

vi.mock("@/modules/invoices/services/render-invoice-pdf", () => ({
	renderInvoicePdf: mockRenderInvoicePdf,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: () => ["orders-list"],
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
}));

vi.mock("@/modules/orders/constants/order.constants", () => ({
	GET_ORDER_SELECT_ADMIN: { id: true },
}));

vi.mock("@/modules/invoices/services/check-sequence-continuity.service", () => ({
	checkSequenceContinuity: mockCheckSequenceContinuity,
}));

import { reconcileInvoices } from "../reconcile-invoices.service";

function buildCandidate(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-00001",
		userId: "user-1",
		paymentStatus: "PAID",
		invoiceStatus: null,
		invoiceNumber: null,
		invoicePdfUrl: null,
		invoiceGeneratedAt: null,
		creditNoteNumber: null,
		paidAt: new Date("2026-05-27T00:00:00Z"),
		invoiceRetryDeferred: true,
		invoiceReconcileAttempts: 0,
		...overrides,
	};
}

describe("reconcileInvoices (OPS-AUDIT-002)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.order.update.mockResolvedValue({ invoiceReconcileAttempts: 1 });
		mockBuildInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(new Uint8Array([1, 2, 3]));
		// Pass 0 backfill : noop par défaut (la plupart des candidats ont déjà un
		// snapshot ou pas de invoiceGeneratedAt → guard skip).
		mockBackfillInvoiceDataSnapshot.mockResolvedValue(null);
		// Default success for chained passes so a Pass 1 success doesn't trip Pass 2
		mockArchiveInvoicePdf.mockResolvedValue({ url: "https://utfs.io/x.pdf" });
		// Resolve to undefined so `await fn().catch(...)` in escalate() works
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		// EINV-SEQ-007 : continuité saine par défaut (passe 4 isolée — testée à part).
		mockCheckSequenceContinuity.mockResolvedValue([]);
	});

	it("returns zeros + hasMore=false when no candidates", async () => {
		const result = await reconcileInvoices();
		expect(result).toMatchObject({
			processed: 0,
			errored: 0,
			skipped: 0,
			invoiceNumberRecovered: 0,
			pdfArchiveRecovered: 0,
			creditNoteRecovered: 0,
			hasMore: false,
		});
		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		expect(mockArchiveInvoicePdf).not.toHaveBeenCalled();
		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});

	it("Pass 1: recovers invoiceNumber for PAID order with no invoiceNumber", async () => {
		// Candidate already has invoicePdfUrl so Pass 2 doesn't trigger after Pass 1
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({ invoicePdfUrl: "https://utfs.io/existing.pdf" }),
		]);
		mockPersistInvoiceNumber.mockResolvedValueOnce({
			invoiceNumber: "F-2026-00042",
			invoiceGeneratedAt: new Date(),
		});

		const result = await reconcileInvoices();

		expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-1", "user-1", {
			source: "SYSTEM",
			authorName: "Système (reconcile-invoices)",
		});
		expect(result.processed).toBe(1);
		expect(result.invoiceNumberRecovered).toBe(1);
		expect(mockCreateOrderAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				action: "INVOICE_RECONCILED",
				source: "SYSTEM",
				authorName: "Système (reconcile-invoices)",
			}),
		);
	});

	it("Pass 0: backfills invoiceDataSnapshot for legacy invoiced order with null snapshot (EINV-PDF-005)", async () => {
		// Facture legacy : numéro émis, PDF déjà archivé, MAIS snapshot comptable
		// manquant (émise avant l'introduction du snapshot figé). invoicePdfUrl set
		// + paymentStatus PAID → seule la Passe 0 doit s'exécuter.
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({
				invoiceNumber: "F-2026-00007",
				invoiceStatus: "GENERATED",
				invoiceGeneratedAt: new Date("2026-03-01T00:00:00Z"),
				invoicePdfUrl: "https://utfs.io/existing.pdf",
				invoiceDataSnapshot: null,
				invoiceRetryDeferred: false,
			}),
		]);
		mockBackfillInvoiceDataSnapshot.mockResolvedValueOnce({
			invoiceDataHash: "a".repeat(64),
			invoiceDataSnapshot: { invoiceNumber: "F-2026-00007" },
		});

		const result = await reconcileInvoices();

		expect(mockBackfillInvoiceDataSnapshot).toHaveBeenCalledWith("order-1");
		expect(result.snapshotBackfilled).toBe(1);
		expect(result.processed).toBe(1);
		// PDF déjà archivé → Passe 2 ne se déclenche pas.
		expect(mockArchiveInvoicePdf).not.toHaveBeenCalled();
		expect(mockCreateOrderAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "INVOICE_RECONCILED",
				metadata: expect.objectContaining({ snapshotBackfilled: true }),
			}),
		);
	});

	it("Pass 0 skipped when snapshot already present (idempotent)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({
				invoiceNumber: "F-2026-00008",
				invoiceStatus: "GENERATED",
				invoiceGeneratedAt: new Date("2026-03-01T00:00:00Z"),
				invoicePdfUrl: "https://utfs.io/existing.pdf",
				invoiceDataSnapshot: { invoiceNumber: "F-2026-00008" },
				invoiceRetryDeferred: false,
			}),
		]);

		const result = await reconcileInvoices();

		expect(mockBackfillInvoiceDataSnapshot).not.toHaveBeenCalled();
		expect(result.snapshotBackfilled).toBe(0);
	});

	it("Pass 2: re-archives PDF when invoiceNumber set but invoicePdfUrl missing", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({
				invoiceNumber: "F-2026-00042",
				invoiceStatus: "GENERATED",
				invoicePdfUrl: null,
			}),
		]);
		mockArchiveInvoicePdf.mockResolvedValueOnce({ url: "https://utfs.io/x.pdf" });

		const result = await reconcileInvoices();

		expect(mockArchiveInvoicePdf).toHaveBeenCalledWith(
			"order-1",
			"F-2026-00042",
			expect.any(Uint8Array),
		);
		expect(result.pdfArchiveRecovered).toBe(1);
		expect(result.processed).toBe(1);
	});

	it("Pass 3: voids invoice when REFUNDED order has GENERATED status without credit note", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({
				invoiceNumber: "F-2026-00042",
				invoiceStatus: "GENERATED",
				invoicePdfUrl: "https://utfs.io/x.pdf",
				paymentStatus: "REFUNDED",
				creditNoteNumber: null,
			}),
		]);
		mockVoidInvoice.mockResolvedValueOnce({
			kind: "voided",
			creditNoteNumber: "A-2026-00007",
		});

		const result = await reconcileInvoices();

		expect(mockVoidInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				source: "SYSTEM",
				authorName: "Système (reconcile-invoices)",
				authorId: null,
			}),
		);
		expect(result.creditNoteRecovered).toBe(1);
		expect(result.processed).toBe(1);
	});

	it("escalates to admin via sendAdminCronFailedAlert after 3 failed attempts", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockPersistInvoiceNumber.mockResolvedValueOnce(null);
		mockPrisma.order.update.mockResolvedValueOnce({ invoiceReconcileAttempts: 3 });

		const result = await reconcileInvoices();

		expect(result.errored).toBe(1);
		expect(result.escalated).toBe(1);
		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				job: "reconcile-invoices",
				errors: 1,
				details: expect.objectContaining({
					orderId: "order-1",
					orderNumber: "SYN-2026-00001",
					attempts: 3,
					threshold: 3,
				}),
			}),
		);
	});

	it("does NOT escalate when invoiceReconcileAttempts < 3", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockPersistInvoiceNumber.mockResolvedValueOnce(null);
		mockPrisma.order.update.mockResolvedValueOnce({ invoiceReconcileAttempts: 2 });

		const result = await reconcileInvoices();

		expect(result.escalated).toBe(0);
		expect(result.skipped).toBe(1);
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	it("counts errored when a service throws synchronously", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockPersistInvoiceNumber.mockRejectedValueOnce(new Error("DB down"));

		const result = await reconcileInvoices();
		expect(result.errored).toBe(1);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("resets invoiceRetryDeferred=false on full successful recovery + writes audit trail", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({ invoicePdfUrl: "https://utfs.io/existing.pdf" }),
		]);
		mockPersistInvoiceNumber.mockResolvedValueOnce({
			invoiceNumber: "F-2026-00042",
			invoiceGeneratedAt: new Date(),
		});

		await reconcileInvoices();

		// 2 update calls expected: NONE in success path because anyFailure=false →
		// final reset {invoiceRetryDeferred:false, invoiceReconcileAttempts:0}.
		const resetCall = mockPrisma.order.update.mock.calls.find(
			(c) => c[0]?.data?.invoiceRetryDeferred === false,
		);
		expect(resetCall).toBeDefined();
		expect(resetCall?.[0]?.data).toEqual({
			invoiceRetryDeferred: false,
			invoiceReconcileAttempts: 0,
		});
		expect(mockCreateOrderAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "INVOICE_RECONCILED",
				metadata: expect.objectContaining({
					invoiceNumberRecovered: true,
				}),
			}),
		);
	});

	it("filters candidates by (DLQ flag OR legacy snapshot-null) + paidAt>6h (MIN_AGE_MS quarantine)", async () => {
		await reconcileInvoices();
		const findManyArgs = mockPrisma.order.findMany.mock.calls[0]?.[0];
		expect(findManyArgs?.where).toMatchObject({
			deletedAt: null,
			AND: [
				{
					OR: [
						{ invoiceRetryDeferred: true },
						// EINV-PDF-005 : facture legacy à snapshot manquant.
						{ invoiceNumber: { not: null }, invoiceDataSnapshot: expect.anything() },
					],
				},
				{ OR: [{ paidAt: { lt: expect.any(Date) } }, { paidAt: null }] },
			],
		});
	});

	it("propagates hasMore=true when batch is fully consumed", async () => {
		const fullBatch = Array.from({ length: 25 }, (_, i) =>
			buildCandidate({ id: `order-${i}`, orderNumber: `SYN-2026-${String(i).padStart(5, "0")}` }),
		);
		mockPrisma.order.findMany.mockResolvedValueOnce(fullBatch);
		mockPersistInvoiceNumber.mockResolvedValue({
			invoiceNumber: "F-2026-99999",
			invoiceGeneratedAt: new Date(),
		});

		const result = await reconcileInvoices();
		expect(result.hasMore).toBe(true);
	});

	it("does NOT mutate when order is already healthy (drops flag silently)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({
				invoiceNumber: "F-2026-00042",
				invoiceStatus: "GENERATED",
				invoicePdfUrl: "https://utfs.io/x.pdf",
				paymentStatus: "PAID",
				creditNoteNumber: null,
			}),
		]);

		const result = await reconcileInvoices();

		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		expect(mockArchiveInvoicePdf).not.toHaveBeenCalled();
		expect(mockVoidInvoice).not.toHaveBeenCalled();
		expect(result.skipped).toBe(1);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { invoiceRetryDeferred: false, invoiceReconcileAttempts: 0 },
			}),
		);
	});

	describe("Passe 4 — contrôle de continuité (EINV-SEQ-007)", () => {
		it("alerte l'admin + remonte continuityIssues quand un trou de séquence est détecté", async () => {
			mockCheckSequenceContinuity.mockResolvedValue([
				{
					kind: "invoice",
					year: 2026,
					prefix: "F-2026-",
					max: 3,
					count: 2,
					missing: [2],
					duplicates: [],
				},
			]);

			const result = await reconcileInvoices();

			expect(result.continuityIssues).toBe(1);
			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "reconcile-invoices",
					details: expect.objectContaining({ type: "sequence-continuity-breach" }),
				}),
			);
		});

		it("ne mute rien et n'alerte pas quand les séquences sont saines", async () => {
			mockCheckSequenceContinuity.mockResolvedValue([]);

			const result = await reconcileInvoices();

			expect(result.continuityIssues).toBe(0);
			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});

		it("ne casse jamais le cron si le contrôle de continuité throw", async () => {
			mockCheckSequenceContinuity.mockRejectedValue(new Error("DB down"));

			const result = await reconcileInvoices();

			expect(result.continuityIssues).toBe(0);
			expect(result.processed).toBe(0);
		});
	});
});
