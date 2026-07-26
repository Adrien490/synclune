import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockListFiles, mockDeleteFiles, mockExtractFileKey } = vi.hoisted(() => ({
	mockPrisma: {
		skuMedia: { findMany: vi.fn() },
		reviewMedia: { findMany: vi.fn() },
		user: { findMany: vi.fn() },
		orderItem: { findMany: vi.fn() },
		order: { findMany: vi.fn() },
		refund: { findMany: vi.fn() },
		// Curseur de reprise du balayage UploadThing (audit média M2)
		storeSettings: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockListFiles: vi.fn(),
	mockDeleteFiles: vi.fn(),
	mockExtractFileKey: vi.fn((url: string) => {
		const match = url.match(/\/f\/(.+)$/);
		return match ? match[1] : null;
	}),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("uploadthing/server", () => ({
	UTApi: class {
		listFiles = mockListFiles;
		deleteFiles = mockDeleteFiles;
	},
}));

vi.mock("@/modules/media/utils/extract-file-key", () => ({
	extractFileKeyFromUrl: mockExtractFileKey,
}));

import { cleanupOrphanMedia } from "../cleanup-orphan-media.service";
import { CronDeadlineExceededError } from "@/modules/cron/lib/cron-result";

describe("cleanupOrphanMedia", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock implementations to clear mockResolvedValueOnce queues
		mockListFiles.mockReset();
		mockDeleteFiles.mockReset();

		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.user.findMany.mockResolvedValue([]);
		mockPrisma.orderItem.findMany.mockResolvedValue([]);
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.refund.findMany.mockResolvedValue([]);
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ orphanMediaScanOffset: 0 });
		mockPrisma.storeSettings.update.mockResolvedValue({});

		mockListFiles.mockResolvedValue({ files: [] });
		mockDeleteFiles.mockResolvedValue({ success: true });

		// Re-apply extractFileKey implementation after clearAllMocks
		mockExtractFileKey.mockImplementation((url: string) => {
			const match = url.match(/\/f\/(.+)$/);
			return match ? match[1] : null;
		});
	});

	it("should return zero counts when no files exist in UploadThing", async () => {
		const result = await cleanupOrphanMedia();

		expect(result).toMatchObject({
			filesScanned: 0,
			orphansDeleted: 0,
			errors: 0,
		});
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should identify and delete orphan files not referenced in DB", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		mockListFiles.mockResolvedValue({
			files: [
				{ key: "orphan-1", uploadedAt: twoDaysAgo },
				{ key: "orphan-2", uploadedAt: twoDaysAgo },
				{ key: "orphan-3", uploadedAt: twoDaysAgo },
			],
		});

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(3);
		expect(result.orphansDeleted).toBe(3);
		expect(result.errors).toBe(0);
		expect(mockDeleteFiles).toHaveBeenCalledWith(["orphan-1", "orphan-2", "orphan-3"]);
	});

	it("should skip files less than 24 hours old", async () => {
		const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		mockListFiles.mockResolvedValue({
			files: [
				{ key: "recent-file", uploadedAt: oneHourAgo },
				{ key: "old-orphan", uploadedAt: twoDaysAgo },
			],
		});

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(2);
		expect(result.orphansDeleted).toBe(1);
		expect(mockDeleteFiles).toHaveBeenCalledWith(["old-orphan"]);
	});

	it("should not delete files that are referenced in DB", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{
				url: "https://utfs.io/f/sku-media-1",
				thumbnailUrl: "https://utfs.io/f/sku-thumb-1",
			},
		]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/review-media-1" },
		]);
		mockPrisma.user.findMany.mockResolvedValue([{ image: "https://utfs.io/f/user-avatar-1" }]);

		mockListFiles.mockResolvedValue({
			files: [
				{ key: "sku-media-1", uploadedAt: twoDaysAgo },
				{ key: "sku-thumb-1", uploadedAt: twoDaysAgo },
				{ key: "review-media-1", uploadedAt: twoDaysAgo },
				{ key: "user-avatar-1", uploadedAt: twoDaysAgo },
				{ key: "orphan-file", uploadedAt: twoDaysAgo },
			],
		});

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(5);
		expect(result.orphansDeleted).toBe(1);
		expect(mockDeleteFiles).toHaveBeenCalledWith(["orphan-file"]);
	});

	// MEDIA-AUDIT-003 : un fichier encore référencé par un snapshot de commande
	// (OrderItem.productImageUrl / skuImageUrl) ne doit jamais être supprimé, même
	// si sa ligne SkuMedia source a disparu.
	it("should not delete files referenced only by an OrderItem snapshot", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		// Aucun SkuMedia/ReviewMedia/User ne référence ces fichiers : seuls des
		// snapshots de commande les pointent.
		mockPrisma.orderItem.findMany.mockResolvedValue([
			{
				productImageUrl: "https://utfs.io/f/order-snapshot-1",
				skuImageUrl: "https://utfs.io/f/order-snapshot-2",
			},
		]);

		mockListFiles.mockResolvedValue({
			files: [
				{ key: "order-snapshot-1", uploadedAt: twoDaysAgo },
				{ key: "order-snapshot-2", uploadedAt: twoDaysAgo },
				{ key: "true-orphan", uploadedAt: twoDaysAgo },
			],
		});

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(3);
		expect(result.orphansDeleted).toBe(1);
		expect(mockDeleteFiles).toHaveBeenCalledWith(["true-orphan"]);
	});

	// RGPD-AUDIT F-C : les PDF de facture/avoir archivés (Order.invoicePdfUrl /
	// creditNotePdfUrl) sont des archives légales (Art. L102 B LPF, 10 ans). Ils ne
	// doivent JAMAIS être considérés orphelins tant qu'ils sont dans leur rétention.
	it("should not delete archived invoice/credit-note PDFs referenced by an Order", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		mockPrisma.order.findMany.mockResolvedValue([
			{
				invoicePdfUrl: "https://utfs.io/f/invoice-pdf-1",
				creditNotePdfUrl: "https://utfs.io/f/credit-note-pdf-1",
			},
		]);

		mockListFiles.mockResolvedValue({
			files: [
				{ key: "invoice-pdf-1", uploadedAt: twoDaysAgo },
				{ key: "credit-note-pdf-1", uploadedAt: twoDaysAgo },
				{ key: "true-orphan", uploadedAt: twoDaysAgo },
			],
		});

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(3);
		expect(result.orphansDeleted).toBe(1);
		expect(mockDeleteFiles).toHaveBeenCalledWith(["true-orphan"]);
	});

	// Audit rétention PII 2026-07-09 : les avoirs PARTIELS sont archivés PAR REFUND
	// (Refund.creditNotePdfUrl) — mêmes archives légales 10 ans (Art. L102 B LPF).
	// Sans le scan Refund, ce cron les détruirait comme orphelins dès 24h.
	it("should not delete per-refund credit-note PDFs referenced by a Refund", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		mockPrisma.refund.findMany.mockResolvedValue([
			{ id: "refund-1", creditNotePdfUrl: "https://utfs.io/f/refund-credit-note-1" },
		]);

		mockListFiles.mockResolvedValue({
			files: [
				{ key: "refund-credit-note-1", uploadedAt: twoDaysAgo },
				{ key: "true-orphan", uploadedAt: twoDaysAgo },
			],
		});

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(2);
		expect(result.orphansDeleted).toBe(1);
		expect(mockDeleteFiles).toHaveBeenCalledWith(["true-orphan"]);
	});

	it("should handle UploadThing deleteFiles errors gracefully", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		mockListFiles.mockResolvedValue({
			files: [
				{ key: "orphan-1", uploadedAt: twoDaysAgo },
				{ key: "orphan-2", uploadedAt: twoDaysAgo },
			],
		});
		mockDeleteFiles.mockRejectedValue(new Error("UploadThing API error"));

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(2);
		expect(result.orphansDeleted).toBe(0);
		expect(result.errors).toBe(2);
	});

	it("should handle top-level errors", async () => {
		mockPrisma.skuMedia.findMany.mockRejectedValue(new Error("Database connection error"));

		await expect(cleanupOrphanMedia()).rejects.toThrow("Database connection error");
	});

	it("should respect MAX_PAGES_PER_RUN pagination limit", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		const createPage = () => ({
			files: Array.from({ length: 500 }, (_, i) => ({
				key: `file-${Math.random()}-${i}`,
				uploadedAt: twoDaysAgo,
			})),
		});

		// Mock 6 pages, but MAX_PAGES_PER_RUN is 5
		mockListFiles
			.mockResolvedValueOnce(createPage())
			.mockResolvedValueOnce(createPage())
			.mockResolvedValueOnce(createPage())
			.mockResolvedValueOnce(createPage())
			.mockResolvedValueOnce(createPage())
			.mockResolvedValueOnce(createPage());

		const result = await cleanupOrphanMedia();

		expect(result.filesScanned).toBe(2500);
		expect(mockListFiles).toHaveBeenCalledTimes(5);
	});

	it("should stop when UploadThing returns empty page", async () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		// Return a full page (500) then an empty page to trigger the break
		const fullPage = Array.from({ length: 500 }, (_, i) => ({
			key: `file-${i}`,
			uploadedAt: twoDaysAgo,
		}));

		mockListFiles.mockResolvedValueOnce({ files: fullPage }).mockResolvedValueOnce({ files: [] });

		const result = await cleanupOrphanMedia();

		// First page: 500 files scanned, second page: 0 (empty, breaks loop)
		expect(result.filesScanned).toBe(500);
		expect(mockListFiles).toHaveBeenCalledTimes(2);
	});

	it("re-throws CronDeadlineExceededError enriched with partial counts when DB scan exceeds deadline", async () => {
		mockPrisma.skuMedia.findMany.mockRejectedValue(
			new CronDeadlineExceededError("Deadline hit during skuMedia-scan", {
				processed: 0,
				errored: 0,
				skipped: 0,
				step: "skuMedia-scan",
			}),
		);

		await expect(cleanupOrphanMedia()).rejects.toMatchObject({
			name: "CronDeadlineExceededError",
			partial: expect.objectContaining({
				step: "skuMedia-scan",
				filesScanned: 0,
				orphansDeleted: 0,
				errors: 0,
			}),
		});
	});

	it("breaks gracefully with hasMore: true when UploadThing listFiles hangs past the deadline", async () => {
		vi.useFakeTimers();
		try {
			// Hang forever — only the internal withDeadline timer will resolve the race.
			mockListFiles.mockImplementation(() => new Promise(() => {}));

			const promise = cleanupOrphanMedia();
			// Advance past BATCH_DEADLINE_MS (45_000) so the timeout timer fires.
			await vi.advanceTimersByTimeAsync(50_000);
			const result = await promise;

			expect(result).toMatchObject({
				orphansDeleted: 0,
				errors: 0,
				hasMore: true,
			});
			expect(mockDeleteFiles).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it("breaks gracefully with hasMore: true when UploadThing deleteFiles hangs past the deadline", async () => {
		vi.useFakeTimers();
		try {
			const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
			mockListFiles.mockResolvedValueOnce({
				files: [{ key: "orphan-hang", uploadedAt: twoDaysAgo }],
			});
			mockDeleteFiles.mockImplementation(() => new Promise(() => {}));

			const promise = cleanupOrphanMedia();
			await vi.advanceTimersByTimeAsync(50_000);
			const result = await promise;

			expect(result).toMatchObject({
				orphansDeleted: 0,
				hasMore: true,
			});
		} finally {
			vi.useRealTimers();
		}
	});

	/**
	 * Audit média M2 : sans curseur persistant, `offset` repartait de 0 à chaque
	 * exécution et rien au-delà de MAX_PAGES_PER_RUN × UPLOADTHING_LIST_LIMIT
	 * (2500 fichiers) n'était jamais balayé. Les archives PDF de facture — une par
	 * commande payée, toutes référencées — saturent cette fenêtre à mesure que les
	 * commandes s'accumulent, jusqu'à rendre la collecte d'orphelins inopérante
	 * sans la moindre erreur remontée.
	 */
	describe("curseur de reprise (offset persistant)", () => {
		it("reprend le balayage à l'offset persisté", async () => {
			mockPrisma.storeSettings.findUnique.mockResolvedValue({ orphanMediaScanOffset: 2500 });
			mockListFiles.mockResolvedValue({ files: [] });

			await cleanupOrphanMedia();

			expect(mockListFiles).toHaveBeenCalledWith(expect.objectContaining({ offset: 2500 }));
		});

		it("persiste l'offset atteint quand la liste n'est pas épuisée", async () => {
			const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
			// Page pleine (= UPLOADTHING_LIST_LIMIT) → il reste des fichiers après.
			const fullPage = Array.from({ length: 500 }, (_, i) => ({
				key: `k${i}`,
				uploadedAt: twoDaysAgo,
			}));
			mockPrisma.storeSettings.findUnique.mockResolvedValue({ orphanMediaScanOffset: 0 });
			mockListFiles.mockResolvedValue({ files: fullPage });

			const result = await cleanupOrphanMedia();

			expect(result.hasMore).toBe(true);
			expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: { orphanMediaScanOffset: 2500 } }),
			);
		});

		it("remet le curseur à 0 en fin de liste (balayage cyclique)", async () => {
			mockPrisma.storeSettings.findUnique.mockResolvedValue({ orphanMediaScanOffset: 1000 });
			// Page incomplète → fin de liste atteinte.
			mockListFiles.mockResolvedValue({
				files: [{ key: "tail", uploadedAt: new Date().toISOString() }],
			});

			await cleanupOrphanMedia();

			expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: { orphanMediaScanOffset: 0 } }),
			);
		});

		it("ne fait pas échouer le run si la persistance du curseur échoue", async () => {
			mockPrisma.storeSettings.update.mockRejectedValue(new Error("DB down"));
			mockListFiles.mockResolvedValue({ files: [] });

			await expect(cleanupOrphanMedia()).resolves.toMatchObject({ orphansDeleted: 0 });
		});
	});
});
