import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockUtapi, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findUnique: vi.fn(),
			update: vi.fn().mockResolvedValue({}),
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

import { archiveInvoicePdf } from "../archive-invoice-pdf.service";

const sampleBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

/**
 * @regression ORD-COMPLY-005 (audit conformité 2026-05-27)
 * Verrouille l'archivage immuable du PDF facture sur UploadThing.
 */
describe("archiveInvoicePdf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.update.mockResolvedValue({});
	});

	it("uploads to UploadThing + persists URL + SHA-256 hash on first call", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: null,
			invoicePdfHash: null,
		});
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/inv-1.pdf", key: "key1" } },
		]);

		const result = await archiveInvoicePdf("order-1", "F-2026-00001", sampleBytes);

		expect(result?.invoicePdfUrl).toBe("https://ufs.example/inv-1.pdf");
		expect(result?.invoicePdfHash).toMatch(/^[a-f0-9]{64}$/);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: expect.objectContaining({
					invoicePdfUrl: "https://ufs.example/inv-1.pdf",
					invoicePdfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
				}),
			}),
		);
	});

	it("is idempotent — returns existing URL/hash without re-uploading", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: "https://ufs.example/existing.pdf",
			invoicePdfHash: "a".repeat(64),
		});

		const result = await archiveInvoicePdf("order-2", "F-2026-00002", sampleBytes);

		expect(result).toEqual({
			invoicePdfUrl: "https://ufs.example/existing.pdf",
			invoicePdfHash: "a".repeat(64),
		});
		expect(mockUtapi.uploadFiles).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("returns null when UploadThing returns no ufsUrl", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: null,
			invoicePdfHash: null,
		});
		mockUtapi.uploadFiles.mockResolvedValue([{ data: null }]);

		const result = await archiveInvoicePdf("order-3", "F-2026-00003", sampleBytes);

		expect(result).toBeNull();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("does not throw when UploadThing crashes — best-effort archive", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: null,
			invoicePdfHash: null,
		});
		mockUtapi.uploadFiles.mockRejectedValue(new Error("UploadThing 502"));

		await expect(archiveInvoicePdf("order-4", "F-2026-00004", sampleBytes)).resolves.toBeNull();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("accepts ArrayBuffer input (e.g. jsPDF output)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: null,
			invoicePdfHash: null,
		});
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/inv-ab.pdf", key: "key-ab" } },
		]);

		const ab = sampleBytes.buffer.slice(0) as ArrayBuffer;
		const result = await archiveInvoicePdf("order-5", "F-2026-00005", ab);

		expect(result?.invoicePdfUrl).toBe("https://ufs.example/inv-ab.pdf");
		expect(result?.invoicePdfHash).toMatch(/^[a-f0-9]{64}$/);
	});
});
