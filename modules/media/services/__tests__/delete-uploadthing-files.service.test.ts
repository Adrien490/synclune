import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockDeleteFiles, mockLogger, mockPrisma } = vi.hoisted(() => ({
	mockDeleteFiles: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	// Garde anti-suppression des archives fiscales (audit média M7)
	mockPrisma: {
		order: { findMany: vi.fn() },
		refund: { findMany: vi.fn() },
	},
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

vi.mock("uploadthing/server", () => ({
	UTApi: class MockUTApi {
		deleteFiles = mockDeleteFiles;
	},
}));

vi.mock("@/modules/media/utils/extract-file-key", () => ({
	extractFileKeysFromUrls: vi.fn(),
}));

vi.mock("@/modules/media/utils/validate-media-file", () => ({
	isValidUploadThingUrl: vi.fn(),
}));

import {
	deleteUploadThingFilesFromUrls,
	deleteUploadThingFileFromUrl,
} from "../delete-uploadthing-files.service";
import { extractFileKeysFromUrls } from "@/modules/media/utils/extract-file-key";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	// Par défaut aucune URL n'est une archive fiscale.
	mockPrisma.order.findMany.mockResolvedValue([]);
	mockPrisma.refund.findMany.mockResolvedValue([]);
});

// ============================================================================
// deleteUploadThingFilesFromUrls
// ============================================================================

describe("deleteUploadThingFilesFromUrls", () => {
	it("returns {0, 0} for empty array", async () => {
		const result = await deleteUploadThingFilesFromUrls([]);

		expect(result).toEqual({ deleted: 0, failed: 0 });
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("returns {0, 0} when no URLs are valid UploadThing URLs", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(false);

		const result = await deleteUploadThingFilesFromUrls([
			"https://example.com/file.jpg",
			"https://other.com/img.png",
		]);

		expect(result).toEqual({ deleted: 0, failed: 0 });
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("deletes files successfully", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc123.jpg", "def456.png"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 2 });

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/abc123.jpg",
			"https://utfs.io/f/def456.png",
		]);

		expect(result).toEqual({ deleted: 2, failed: 0 });
		expect(mockDeleteFiles).toHaveBeenCalledWith(["abc123.jpg", "def456.png"]);
	});

	it("filters out non-UploadThing URLs before extraction", async () => {
		vi.mocked(isValidUploadThingUrl).mockImplementation((url) => url.includes("utfs.io"));
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/abc123.jpg",
			"https://example.com/other.jpg",
		]);

		expect(result).toEqual({ deleted: 1, failed: 0 });
		expect(extractFileKeysFromUrls).toHaveBeenCalledWith(["https://utfs.io/f/abc123.jpg"]);
	});

	it("handles failed URL extractions", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: ["https://utfs.io/f/bad-url"],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/abc123.jpg",
			"https://utfs.io/f/bad-url",
		]);

		expect(result).toEqual({ deleted: 1, failed: 1 });
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("1 URL(s) could not be extracted"),
			{ service: "delete-uploadthing-files" },
		);
	});

	it("returns {0, failed} when all extractions fail", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: [],
			failedUrls: ["https://utfs.io/f/bad1", "https://utfs.io/f/bad2"],
		});

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/bad1",
			"https://utfs.io/f/bad2",
		]);

		expect(result).toEqual({ deleted: 0, failed: 2 });
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("handles UTApi returning success=false", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: false, deletedCount: 0 });

		const result = await deleteUploadThingFilesFromUrls(["https://utfs.io/f/abc123.jpg"]);

		expect(result).toEqual({ deleted: 0, failed: 1 });
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("success=false"), {
			service: "delete-uploadthing-files",
		});
	});

	it("treats already-absent keys as cleared, not failed (deletedCount < keys, success=true)", async () => {
		// UTApi.deleteFiles est un bulk sans rapport par clé : une clé inexistante
		// (fichier déjà supprimé par un run interrompu) n'incrémente pas deletedCount
		// mais n'est PAS un échec. Compter ces clés en `failed` bloquait
		// définitivement la purge PII 10 ans au retry (audit rétention 2026-07-09).
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc.jpg", "def.jpg", "ghi.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 2 });

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/abc.jpg",
			"https://utfs.io/f/def.jpg",
			"https://utfs.io/f/ghi.jpg",
		]);

		expect(result).toEqual({ deleted: 2, failed: 0 });
		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.stringContaining("2/3 file(s) deleted (1 already absent)"),
			{ service: "delete-uploadthing-files" },
		);
	});

	it("handles UTApi exception gracefully", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc.jpg"],
			failedUrls: [],
		});
		const thrownError = new Error("Network error");
		mockDeleteFiles.mockRejectedValue(thrownError);

		const result = await deleteUploadThingFilesFromUrls(["https://utfs.io/f/abc.jpg"]);

		expect(result).toEqual({ deleted: 0, failed: 1 });
		expect(mockLogger.error).toHaveBeenCalledWith("Failed to delete files", thrownError, {
			service: "delete-uploadthing-files",
		});
	});

	it("handles non-Error exception", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockRejectedValue("string error");

		const result = await deleteUploadThingFilesFromUrls(["https://utfs.io/f/abc.jpg"]);

		expect(result).toEqual({ deleted: 0, failed: 1 });
		expect(mockLogger.error).toHaveBeenCalledWith("Failed to delete files", "string error", {
			service: "delete-uploadthing-files",
		});
	});
});

// ============================================================================
// deleteUploadThingFileFromUrl
// ============================================================================

describe("deleteUploadThingFileFromUrl", () => {
	it("returns false for null url", async () => {
		const result = await deleteUploadThingFileFromUrl(null);
		expect(result).toBe(false);
	});

	it("returns false for undefined url", async () => {
		const result = await deleteUploadThingFileFromUrl(undefined);
		expect(result).toBe(false);
	});

	it("returns false for invalid UploadThing URL", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(false);
		const result = await deleteUploadThingFileFromUrl("https://example.com/file.jpg");
		expect(result).toBe(false);
	});

	it("returns true when file is successfully deleted", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");
		expect(result).toBe(true);
	});

	it("returns false when deletion fails", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: false, deletedCount: 0 });

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");
		expect(result).toBe(false);
	});
});

// ============================================================================
// Garde archives fiscales
// ============================================================================

/**
 * @regression media-delete-preserves-fiscal-archives
 *
 * Audit média M7 : les PDF de facture (`Order.invoicePdfUrl`), d'avoir sur
 * commande (`Order.creditNotePdfUrl`) et d'avoir partiel
 * (`Refund.creditNotePdfUrl`) vivent dans la MÊME app UploadThing que les médias
 * catalogue. Rien n'empêchait ce service — appelé par les actions produit/SKU/
 * avis et les actions admin de suppression média — d'effacer une archive
 * immuable sous rétention 10 ans (Art. L102 B LPF). Le cron
 * `cleanup-orphan-media` protégeait déjà ces clés côté balayage automatique ;
 * cette garde ferme le chemin manuel.
 *
 * Seul `hard-delete-retention` peut passer outre, via `allowFiscalArchives`.
 */
describe("garde archives fiscales (facture / avoir)", () => {
	const INVOICE_URL = "https://utfs.io/f/invoice-2026-00001.pdf";
	const MEDIA_URL = "https://utfs.io/f/photo.jpg";

	beforeEach(() => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
		vi.mocked(extractFileKeysFromUrls).mockImplementation((urls: string[]) => ({
			keys: urls.map((u) => u.split("/").pop()!),
			failedUrls: [],
		}));
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });
	});

	it("refuse de supprimer un PDF de facture encore référencé", async () => {
		mockPrisma.order.findMany.mockResolvedValue([
			{ invoicePdfUrl: INVOICE_URL, creditNotePdfUrl: null },
		]);

		const result = await deleteUploadThingFilesFromUrls([INVOICE_URL]);

		expect(mockDeleteFiles).not.toHaveBeenCalled();
		expect(result.deleted).toBe(0);
	});

	it("refuse de supprimer un avoir partiel (Refund.creditNotePdfUrl)", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([{ creditNotePdfUrl: INVOICE_URL }]);

		await deleteUploadThingFilesFromUrls([INVOICE_URL]);

		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("supprime les médias ordinaires du même lot mais épargne l'archive", async () => {
		mockPrisma.order.findMany.mockResolvedValue([
			{ invoicePdfUrl: INVOICE_URL, creditNotePdfUrl: null },
		]);

		await deleteUploadThingFilesFromUrls([MEDIA_URL, INVOICE_URL]);

		expect(mockDeleteFiles).toHaveBeenCalledWith(["photo.jpg"]);
	});

	it("laisse passer l'effaceur légitime de fin de rétention", async () => {
		mockPrisma.order.findMany.mockResolvedValue([
			{ invoicePdfUrl: INVOICE_URL, creditNotePdfUrl: null },
		]);

		await deleteUploadThingFilesFromUrls([INVOICE_URL], { allowFiscalArchives: true });

		expect(mockDeleteFiles).toHaveBeenCalledWith(["invoice-2026-00001.pdf"]);
		// Pas même de requête de garde : le chemin est explicitement autorisé.
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});
});
