import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockListFiles, mockDeleteFiles, mockExtractFileKey } =
	vi.hoisted(() => ({
		mockPrisma: {
			skuMedia: { findMany: vi.fn() },
			reviewMedia: { findMany: vi.fn() },
			user: { findMany: vi.fn() },
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

describe("cleanupOrphanMedia", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock implementations to clear mockResolvedValueOnce queues
		mockListFiles.mockReset();
		mockDeleteFiles.mockReset();

		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.user.findMany.mockResolvedValue([]);

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

		expect(result).toEqual({
			filesScanned: 0,
			orphansDeleted: 0,
			errors: 0,
		});
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should identify and delete orphan files not referenced in DB", async () => {
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000
		).toISOString();

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
		expect(mockDeleteFiles).toHaveBeenCalledWith([
			"orphan-1",
			"orphan-2",
			"orphan-3",
		]);
	});

	it("should skip files less than 24 hours old", async () => {
		const oneHourAgo = new Date(
			Date.now() - 1 * 60 * 60 * 1000
		).toISOString();
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000
		).toISOString();

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
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000
		).toISOString();

		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{
				url: "https://utfs.io/f/sku-media-1",
				thumbnailUrl: "https://utfs.io/f/sku-thumb-1",
			},
		]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/review-media-1" },
		]);
		mockPrisma.user.findMany.mockResolvedValue([
			{ image: "https://utfs.io/f/user-avatar-1" },
		]);

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

	it("should handle UploadThing deleteFiles errors gracefully", async () => {
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000
		).toISOString();

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
		mockPrisma.skuMedia.findMany.mockRejectedValue(
			new Error("Database connection error")
		);

		const result = await cleanupOrphanMedia();

		expect(result.errors).toBe(1);
	});

	it("should respect MAX_PAGES_PER_RUN pagination limit", async () => {
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000
		).toISOString();

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
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000
		).toISOString();

		// Return a full page (500) then an empty page to trigger the break
		const fullPage = Array.from({ length: 500 }, (_, i) => ({
			key: `file-${i}`,
			uploadedAt: twoDaysAgo,
		}));

		mockListFiles
			.mockResolvedValueOnce({ files: fullPage })
			.mockResolvedValueOnce({ files: [] });

		const result = await cleanupOrphanMedia();

		// First page: 500 files scanned, second page: 0 (empty, breaks loop)
		expect(result.filesScanned).toBe(500);
		expect(mockListFiles).toHaveBeenCalledTimes(2);
	});
});
