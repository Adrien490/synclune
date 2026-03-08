import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockDeleteFiles, mockLogger } = vi.hoisted(() => ({
	mockDeleteFiles: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

// Mock UTApi as a proper constructable class.
// A regular function (not arrow) is required so `new UTApi()` works correctly.
vi.mock("uploadthing/server", () => {
	function MockUTApi() {
		return { deleteFiles: mockDeleteFiles };
	}
	return { UTApi: MockUTApi };
});

vi.mock("../utils/extract-file-key", () => ({
	extractFileKeysFromUrls: vi.fn(),
}));

vi.mock("../utils/validate-media-file", () => ({
	isValidUploadThingUrl: vi.fn(),
}));

import { extractFileKeysFromUrls } from "../utils/extract-file-key";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import {
	deleteUploadThingFilesFromUrls,
	deleteUploadThingFileFromUrl,
} from "../services/delete-uploadthing-files.service";

const mockExtractFileKeysFromUrls = vi.mocked(extractFileKeysFromUrls);
const mockIsValidUploadThingUrl = vi.mocked(isValidUploadThingUrl);

// ============================================================================
// deleteUploadThingFilesFromUrls
// ============================================================================

describe("deleteUploadThingFilesFromUrls", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return { deleted: 0, failed: 0 } for an empty array without calling any dependency", async () => {
		const result = await deleteUploadThingFilesFromUrls([]);

		expect(result).toEqual({ deleted: 0, failed: 0 });
		expect(mockIsValidUploadThingUrl).not.toHaveBeenCalled();
		expect(mockExtractFileKeysFromUrls).not.toHaveBeenCalled();
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should filter out non-UploadThing URLs and return { deleted: 0, failed: 0 } when none are valid", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);

		const result = await deleteUploadThingFilesFromUrls([
			"https://example.com/image.jpg",
			"https://other.com/photo.png",
		]);

		expect(result).toEqual({ deleted: 0, failed: 0 });
		expect(mockExtractFileKeysFromUrls).not.toHaveBeenCalled();
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should pass only valid UploadThing URLs to extractFileKeysFromUrls", async () => {
		// First URL valid, second invalid
		mockIsValidUploadThingUrl.mockReturnValueOnce(true).mockReturnValueOnce(false);

		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/abc123.jpg",
			"https://evil.com/image.jpg",
		]);

		expect(mockExtractFileKeysFromUrls).toHaveBeenCalledWith(["https://utfs.io/f/abc123.jpg"]);
	});

	it("should call UTApi.deleteFiles with the extracted file keys", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg", "key-two.png"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 2 });

		await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/key-one.jpg",
			"https://utfs.io/f/key-two.png",
		]);

		expect(mockDeleteFiles).toHaveBeenCalledWith(["key-one.jpg", "key-two.png"]);
	});

	it("should return correct counts on success", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg", "key-two.png"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 2 });

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/key-one.jpg",
			"https://utfs.io/f/key-two.png",
		]);

		expect(result).toEqual({ deleted: 2, failed: 0 });
	});

	it("should log a warning and include failed URLs in the count when some key extractions fail", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["good-key.jpg"],
			failedUrls: ["https://utfs.io/f/"],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/good-key.jpg",
			"https://utfs.io/f/",
		]);

		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("1 URL(s) could not be extracted"),
			{ service: "delete-uploadthing-files" },
		);
		expect(result).toEqual({ deleted: 1, failed: 1 });
	});

	it("should return { deleted: 0, failed: 1 } when all valid URLs fail key extraction", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: [],
			failedUrls: ["https://utfs.io/f/"],
		});

		const result = await deleteUploadThingFilesFromUrls(["https://utfs.io/f/"]);

		// No file keys to delete, so deleted = 0; one extraction failure
		expect(result).toEqual({ deleted: 0, failed: 1 });
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should return { deleted: 0, failed: urls.length } when UTApi.deleteFiles throws", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg", "key-two.png"],
			failedUrls: [],
		});
		mockDeleteFiles.mockRejectedValue(new Error("Network failure"));

		const urls = ["https://utfs.io/f/key-one.jpg", "https://utfs.io/f/key-two.png"];
		const result = await deleteUploadThingFilesFromUrls(urls);

		// On UTApi error, returns failed = total number of input URLs
		expect(result).toEqual({ deleted: 0, failed: urls.length });
	});

	it("should log an error message when UTApi.deleteFiles throws", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key.jpg"],
			failedUrls: [],
		});
		const thrownError = new Error("Service unavailable");
		mockDeleteFiles.mockRejectedValue(thrownError);

		await deleteUploadThingFilesFromUrls(["https://utfs.io/f/key.jpg"]);

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to delete files", thrownError, {
			service: "delete-uploadthing-files",
		});
	});

	it("should return { deleted: 0, failed: urls.length } when UTApi returns success=false", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg", "key-two.png"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: false, deletedCount: 0 });

		const urls = ["https://utfs.io/f/key-one.jpg", "https://utfs.io/f/key-two.png"];
		const result = await deleteUploadThingFilesFromUrls(urls);

		expect(result).toEqual({ deleted: 0, failed: urls.length });
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("success=false"), {
			service: "delete-uploadthing-files",
		});
	});

	it("should report partial deletion when UTApi deletedCount < requested keys", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg", "key-two.png", "key-three.webp"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 2 });

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/key-one.jpg",
			"https://utfs.io/f/key-two.png",
			"https://utfs.io/f/key-three.webp",
		]);

		expect(result).toEqual({ deleted: 2, failed: 1 });
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Partial deletion"), {
			service: "delete-uploadthing-files",
		});
	});
});

// ============================================================================
// deleteUploadThingFileFromUrl
// ============================================================================

describe("deleteUploadThingFileFromUrl", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return false for null", async () => {
		const result = await deleteUploadThingFileFromUrl(null);

		expect(result).toBe(false);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should return false for undefined", async () => {
		const result = await deleteUploadThingFileFromUrl(undefined);

		expect(result).toBe(false);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should return false for an invalid UploadThing URL", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);

		const result = await deleteUploadThingFileFromUrl("https://evil.com/image.jpg");

		expect(result).toBe(false);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should return true when deletion succeeds", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");

		expect(result).toBe(true);
	});

	it("should return false when deletion fails because UTApi throws", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockRejectedValue(new Error("Deletion failed"));

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");

		expect(result).toBe(false);
	});

	it("should return false when key extraction fails (deleted count is 0)", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: [],
			failedUrls: ["https://utfs.io/f/"],
		});

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/");

		expect(result).toBe(false);
	});

	it("should return false when UTApi returns success=false without throwing", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: false, deletedCount: 0 });

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");

		expect(result).toBe(false);
	});

	it("should delegate to deleteUploadThingFilesFromUrls with the URL wrapped in an array", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");

		// extractFileKeysFromUrls should be called with the URL in an array
		expect(mockExtractFileKeysFromUrls).toHaveBeenCalledWith(["https://utfs.io/f/abc123.jpg"]);
	});
});
