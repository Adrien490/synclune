import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockDeleteFiles, mockLogger } = vi.hoisted(() => ({
	mockDeleteFiles: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

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

	it("handles partial deletion", async () => {
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

		expect(result).toEqual({ deleted: 2, failed: 1 });
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Partial deletion: 2/3"), {
			service: "delete-uploadthing-files",
		});
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
