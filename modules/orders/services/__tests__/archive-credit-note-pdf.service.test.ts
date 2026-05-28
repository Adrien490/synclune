import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockUtapi, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findUnique: vi.fn(),
			update: vi.fn().mockResolvedValue({ id: "order-1" }),
		},
	},
	mockUtapi: {
		uploadFiles: vi.fn(),
	},
	mockLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/uploadthing", () => ({ utapi: mockUtapi }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { archiveCreditNotePdf } from "../archive-credit-note-pdf.service";

const sampleBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

/**
 * @regression credit-note-archive-2026-05-28
 *
 * Verrouille l'archivage immuable du PDF avoir sur UploadThing (Art. L102 B LPF —
 * symétrique à `archiveInvoicePdf`). L'avoir doit être restituable bit-à-bit
 * sur 10 ans au même titre que la facture (Art. 272-I CGI).
 */
describe("archiveCreditNotePdf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.update.mockResolvedValue({ id: "order-1" });
	});

	it("uploads to UploadThing + persists URL + SHA-256 hash on first call", async () => {
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
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: expect.objectContaining({
					creditNotePdfUrl: "https://ufs.example/cn-1.pdf",
					creditNotePdfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
				}),
			}),
		);
	});

	it("is idempotent — returns existing URL/hash without re-uploading", async () => {
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
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("returns null when UploadThing returns no ufsUrl", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockUtapi.uploadFiles.mockResolvedValue([{ data: null }]);

		const result = await archiveCreditNotePdf("order-3", "A-2026-00003", sampleBytes);

		expect(result).toBeNull();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("does not throw when UploadThing crashes — best-effort archive", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockUtapi.uploadFiles.mockRejectedValue(new Error("UploadThing 502"));

		await expect(archiveCreditNotePdf("order-4", "A-2026-00004", sampleBytes)).resolves.toBeNull();
		expect(mockLogger.error).toHaveBeenCalled();
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
