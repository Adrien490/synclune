import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared deleteFiles mock — declared outside vi.mock so tests can control it per-test
const mockDeleteFiles = vi.fn();

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
		mockIsValidUploadThingUrl
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);

		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue(undefined);

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
		mockDeleteFiles.mockResolvedValue(undefined);

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
		mockDeleteFiles.mockResolvedValue(undefined);

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
		mockDeleteFiles.mockResolvedValue(undefined);

		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		const result = await deleteUploadThingFilesFromUrls([
			"https://utfs.io/f/good-key.jpg",
			"https://utfs.io/f/",
		]);

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("1 URL(s)"),
			expect.arrayContaining(["https://utfs.io/f/"])
		);
		expect(result).toEqual({ deleted: 1, failed: 1 });
		warnSpy.mockRestore();
	});

	it("should return { deleted: 0, failed: 1 } when all valid URLs fail key extraction", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: [],
			failedUrls: ["https://utfs.io/f/"],
		});

		vi.spyOn(console, "warn").mockImplementation(() => undefined);

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

		vi.spyOn(console, "error").mockImplementation(() => undefined);

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
		mockDeleteFiles.mockRejectedValue(new Error("Service unavailable"));

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

		await deleteUploadThingFilesFromUrls(["https://utfs.io/f/key.jpg"]);

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Erreur"),
			"Service unavailable"
		);
		errorSpy.mockRestore();
	});

	it("should log a success message after successful deletion", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue(undefined);

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

		await deleteUploadThingFilesFromUrls(["https://utfs.io/f/key.jpg"]);

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining("1 fichier(s) supprime(s)")
		);
		logSpy.mockRestore();
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
		mockDeleteFiles.mockResolvedValue(undefined);

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

		vi.spyOn(console, "error").mockImplementation(() => undefined);

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");

		expect(result).toBe(false);
	});

	it("should return false when key extraction fails (deleted count is 0)", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: [],
			failedUrls: ["https://utfs.io/f/"],
		});

		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		const result = await deleteUploadThingFileFromUrl("https://utfs.io/f/");

		expect(result).toBe(false);
	});

	it("should delegate to deleteUploadThingFilesFromUrls with the URL wrapped in an array", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["abc123.jpg"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue(undefined);

		await deleteUploadThingFileFromUrl("https://utfs.io/f/abc123.jpg");

		// extractFileKeysFromUrls should be called with the URL in an array
		expect(mockExtractFileKeysFromUrls).toHaveBeenCalledWith(["https://utfs.io/f/abc123.jpg"]);
	});
});
