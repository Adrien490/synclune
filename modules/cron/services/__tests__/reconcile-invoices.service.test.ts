import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockPersistInvoiceNumber,
	mockArchiveInvoicePdf,
	mockVoidInvoice,
	mockBuildInvoiceData,
	mockRenderInvoicePdf,
	mockSendAdminCronFailedAlert,
	mockCreateOrderAudit,
	mockUpdateTag,
	mockLogger,
	mockCheckSequenceContinuity,
	mockEnsureOrderCreditNoteArchived,
	mockEnsureRefundCreditNoteArchived,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
		refund: { findMany: vi.fn(), update: vi.fn() },
	},
	mockPersistInvoiceNumber: vi.fn(),
	mockArchiveInvoicePdf: vi.fn(),
	mockVoidInvoice: vi.fn(),
	mockBuildInvoiceData: vi.fn(),
	mockRenderInvoicePdf: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockCheckSequenceContinuity: vi.fn(),
	mockEnsureOrderCreditNoteArchived: vi.fn(),
	mockEnsureRefundCreditNoteArchived: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

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

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

vi.mock("@/modules/orders/services/persist-invoice-number.service", () => ({
	persistInvoiceNumber: mockPersistInvoiceNumber,
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

// EINV-CREDIT-020 : les services d'archivage eager d'avoir tirent la chaîne
// UploadThing (utapi instancié au chargement) — mockés au niveau module.
vi.mock("@/modules/orders/services/ensure-credit-note-archived.service", () => ({
	ensureOrderCreditNoteArchived: mockEnsureOrderCreditNoteArchived,
}));
vi.mock("@/modules/refunds/services/ensure-credit-note-archived.service", () => ({
	ensureRefundCreditNoteArchived: mockEnsureRefundCreditNoteArchived,
}));

import { reconcileInvoices } from "../reconcile-invoices.service";

function buildCandidate(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-00001",
		paymentStatus: "PAID",
		invoiceStatus: null,
		invoiceNumber: null,
		invoicePdfUrl: null,
		invoiceGeneratedAt: null,
		creditNoteNumber: null,
		paidAt: new Date("2026-05-27T00:00:00Z"),
		invoiceRetryDeferred: true,
		...overrides,
	};
}

describe("reconcileInvoices (OPS-AUDIT-002)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockBuildInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(new Uint8Array([1, 2, 3]));
		// Default success for chained passes so a Pass 1 success doesn't trip Pass 2
		mockArchiveInvoicePdf.mockResolvedValue({ url: "https://utfs.io/x.pdf" });
		// Resolve to undefined so `await fn().catch(...)` in escalate() works
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		// EINV-SEQ-007 : continuité saine par défaut (passe 4 isolée — testée à part).
		mockCheckSequenceContinuity.mockResolvedValue([]);
		// EINV-EREPORT-008 : aucune orpheline par défaut (passe 5 isolée — testée à part).
		// EINV-EREPORT-009 : succès e-reporting par défaut (passes SALES/REFUND).
		mockPrisma.refund.findMany.mockResolvedValue([]);
		// EINV-CREDIT-020 : Passe 3b lit l'état d'archive (findUnique) — par défaut
		// aucun avoir à archiver ; passes 7/8 neutres.
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockEnsureOrderCreditNoteArchived.mockResolvedValue("already-archived");
		mockEnsureRefundCreditNoteArchived.mockResolvedValue("already-archived");
		mockPrisma.refund.update.mockResolvedValue({});
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

		expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-1", {
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
			}),
		);
		expect(result.creditNoteRecovered).toBe(1);
		expect(result.processed).toBe(1);
	});

	// Il n'y a plus de compteur d'escalade (audit du module orders, 2026-08-05) :
	// il ne faisait que retarder de 3 jours l'alerte que
	// `flagInvoiceFailureForReconcile` émet déjà à J+0, et au-delà du seuil il
	// ré-alertait à chaque run. Ce qui doit rester vrai : un échec compte comme
	// `errored` (pas `skipped` — sinon le bouton « Relancer » répondrait « commande
	// déjà saine »), sans écriture en base ni e-mail de relance.
	it("compte un échec en errored, sans compteur ni e-mail de relance", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockPersistInvoiceNumber.mockResolvedValueOnce(null);

		const result = await reconcileInvoices();

		expect(result.errored).toBe(1);
		expect(result.skipped).toBe(0);
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		// Aucune écriture : ni incrément, ni reset du drapeau — la commande doit
		// rester dans la DLQ pour être rejouée la nuit suivante.
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
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

		// Succès complet (anyFailure=false) → reset du seul drapeau restant.
		const resetCall = mockPrisma.order.update.mock.calls.find(
			(c) => c[0]?.data?.invoiceRetryDeferred === false,
		);
		expect(resetCall).toBeDefined();
		expect(resetCall?.[0]?.data).toEqual({ invoiceRetryDeferred: false });
		expect(mockCreateOrderAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "INVOICE_RECONCILED",
				metadata: expect.objectContaining({
					invoiceNumberRecovered: true,
				}),
			}),
		);
	});

	it("filters candidates by (DLQ flag OR unarchived credit note) + paidAt>6h (MIN_AGE_MS quarantine)", async () => {
		await reconcileInvoices();
		const findManyArgs = mockPrisma.order.findMany.mock.calls[0]?.[0];
		expect(findManyArgs?.where).toMatchObject({
			deletedAt: null,
			AND: [
				{
					OR: [
						{ invoiceRetryDeferred: true },
						// EINV-CREDIT-020 : avoir full-void émis mais PDF jamais archivé
						// (sélection directe, pas seulement via le flag DLQ).
						{ creditNoteNumber: { not: null }, creditNotePdfUrl: null },
					],
				},
				{ OR: [{ paidAt: { lt: expect.any(Date) } }, { paidAt: null }] },
				// F3 (RGPD-PII-AUDIT 2026-05-30) : exclut les commandes purgées à 10 ans
				// (piiPurgedAt non null) — sinon régénération depuis colonnes scrubées.
				{ piiPurgedAt: null },
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
				data: { invoiceRetryDeferred: false },
			}),
		);
	});

	/**
	 * @regression invoice-sequence-gap-alerts-admin
	 *
	 * EINV-SEQ-007 / Art. 286 CGI : un TROU de séquence (numéro sauté, pas seulement
	 * un doublon que le @unique+CHECK rejettent) DOIT remonter une alerte admin via
	 * `sendAdminCronFailedAlert` (`type: "sequence-continuity-breach"`). Ce verrou
	 * garde le wiring détection → alerte ; la détection elle-même est couverte par
	 * `check-sequence-continuity.service.test.ts`.
	 */
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

	// EINV-CREDIT-020 — Passes 3b (avoir Order non archivé) + 7 (avoir Refund non
	// archivé) + 8 (intégrité). L'archivage eager est fait par voidInvoice /
	// issueCreditNoteForRefund ; ces passes sont le filet (crash post-tx, upload KO).
	describe("Passes avoirs non archivés + intégrité (EINV-CREDIT-020)", () => {
		it("Passe 3b : archive l'avoir full-void manquant d'un candidat", async () => {
			const candidate = buildCandidate({
				invoiceNumber: "F-2026-00001",
				invoiceGeneratedAt: new Date(),
				invoiceStatus: "VOIDED",
				creditNoteNumber: "A-2026-00001",
				invoiceDataSnapshot: {},
			});
			mockPrisma.order.findMany.mockResolvedValue([candidate]);
			// État d'archive lu par la Passe 3b : pas encore archivé.
			mockPrisma.order.findUnique.mockResolvedValue({ creditNotePdfUrl: null });
			mockEnsureOrderCreditNoteArchived.mockResolvedValue("archived");

			const result = await reconcileInvoices();

			expect(mockEnsureOrderCreditNoteArchived).toHaveBeenCalledWith("order-1");
			expect(result.creditNotePdfRecovered).toBe(1);
			expect(result.processed).toBe(1);
		});

		it("Passe 3b : un échec d'archivage incrémente le compteur d'escalade (anyFailure)", async () => {
			const candidate = buildCandidate({
				invoiceNumber: "F-2026-00001",
				invoiceGeneratedAt: new Date(),
				invoiceStatus: "VOIDED",
				creditNoteNumber: "A-2026-00001",
				invoiceDataSnapshot: {},
			});
			mockPrisma.order.findMany.mockResolvedValue([candidate]);
			mockPrisma.order.findUnique.mockResolvedValue({ creditNotePdfUrl: null });
			mockEnsureOrderCreditNoteArchived.mockResolvedValue("failed");

			const result = await reconcileInvoices();

			expect(result.creditNotePdfRecovered).toBe(0);
			// anyFailure → aucune écriture : ni compteur (retiré), ni reset du drapeau,
			// qui doit rester posé pour que la commande soit rejouée.
			expect(mockPrisma.order.update).not.toHaveBeenCalled();
		});

		it("Passe 7 : draine les avoirs Refund émis non archivés", async () => {
			mockPrisma.refund.findMany
				// Passe 7 (avoirs Refund non archivés) est désormais le seul sweep
				// qui interroge `refund.findMany`.
				.mockResolvedValueOnce([{ id: "refund-1" }, { id: "refund-2" }])
				.mockResolvedValue([]);
			mockEnsureRefundCreditNoteArchived
				.mockResolvedValueOnce("archived")
				.mockResolvedValueOnce("failed");

			const result = await reconcileInvoices();

			expect(mockEnsureRefundCreditNoteArchived).toHaveBeenCalledTimes(2);
			expect(result.refundCreditNotePdfRecovered).toBe(1);
		});

		// Plus de « Passe 8 : intégrité PDF » — le service et ses deux colonnes-curseurs
		// sont partis (audit du module orders, 2026-08-05). La garantie Art. L102 B
		// reste le SHA-256, re-vérifié à chaque téléchargement par les routes PDF.
	});
});
