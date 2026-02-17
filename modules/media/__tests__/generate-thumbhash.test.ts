import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock sharp before importing the service
vi.mock("sharp", () => {
	const mockToBuffer = vi.fn();
	const mockRaw = vi.fn(() => ({ toBuffer: mockToBuffer }));
	const mockResize = vi.fn(() => ({ raw: mockRaw }));
	const mockEnsureAlpha = vi.fn(() => ({ resize: mockResize }));
	const mockSharp = vi.fn(() => ({ ensureAlpha: mockEnsureAlpha }));

	// Expose internal mocks for per-test control
	(mockSharp as Record<string, unknown>).__mockToBuffer = mockToBuffer;
	(mockSharp as Record<string, unknown>).__mockRaw = mockRaw;
	(mockSharp as Record<string, unknown>).__mockResize = mockResize;
	(mockSharp as Record<string, unknown>).__mockEnsureAlpha = mockEnsureAlpha;

	return { default: mockSharp };
});

vi.mock("thumbhash", () => ({
	rgbaToThumbHash: vi.fn(),
	thumbHashToDataURL: vi.fn(),
}));

vi.mock("../services/image-downloader.service", () => ({
	downloadImage: vi.fn(),
	truncateUrl: vi.fn((url: string) => url),
	withRetry: vi.fn(),
}));

vi.mock("../utils/validate-media-file", () => ({
	isValidUploadThingUrl: vi.fn(),
}));

import sharp from "sharp";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { downloadImage, truncateUrl, withRetry } from "../services/image-downloader.service";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import {
	generateThumbHash,
	generateThumbHashWithRetry,
	generateThumbHashFromBuffer,
} from "../services/generate-thumbhash";
import { THUMBHASH_CONFIG } from "../constants/media.constants";

const mockSharp = vi.mocked(sharp) as ReturnType<typeof vi.fn> & Record<string, unknown>;
const mockRgbaToThumbHash = vi.mocked(rgbaToThumbHash);
const mockThumbHashToDataURL = vi.mocked(thumbHashToDataURL);
const mockDownloadImage = vi.mocked(downloadImage);
const mockTruncateUrl = vi.mocked(truncateUrl);
const mockWithRetry = vi.mocked(withRetry);
const mockIsValidUploadThingUrl = vi.mocked(isValidUploadThingUrl);

// Helper to build a valid fake buffer and configure the sharp chain
function setupSharpMock(width = 80, height = 60): Buffer {
	const fakeBuffer = Buffer.alloc(width * height * 4);
	const mockToBuffer = mockSharp.__mockToBuffer as ReturnType<typeof vi.fn>;
	mockToBuffer.mockResolvedValue({
		data: fakeBuffer,
		info: { width, height },
	});
	return fakeBuffer;
}

// Helper to configure thumbhash mocks to return valid values
function setupThumbhashMocks(dataUrl = "data:image/png;base64,abc123"): void {
	const fakeHashBytes = new Uint8Array([1, 2, 3, 4]);
	mockRgbaToThumbHash.mockReturnValue(fakeHashBytes);
	mockThumbHashToDataURL.mockReturnValue(dataUrl);
}

// ============================================================================
// generateThumbHash
// ============================================================================

describe("generateThumbHash", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: truncateUrl returns the URL unchanged
		mockTruncateUrl.mockImplementation((url: string) => url);
	});

	it("should return undefined when domain validation fails for a non-UploadThing URL", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);

		const result = await generateThumbHash("https://evil.com/image.jpg");

		expect(result).toBeUndefined();
		expect(mockDownloadImage).not.toHaveBeenCalled();
	});

	it("should call the custom logWarning when domain validation fails", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);
		const customLog = vi.fn();

		await generateThumbHash("https://evil.com/image.jpg", { logWarning: customLog });

		expect(customLog).toHaveBeenCalledWith(
			"[ThumbHash] Domaine non autorise",
			expect.objectContaining({ url: expect.any(String) })
		);
	});

	it("should skip domain check and attempt download when validateDomain is false", async () => {
		// Even with an invalid domain, the service should proceed to downloadImage
		mockDownloadImage.mockRejectedValue(new Error("Connection refused"));

		const result = await generateThumbHash("https://evil.com/image.jpg", {
			validateDomain: false,
		});

		expect(mockIsValidUploadThingUrl).not.toHaveBeenCalled();
		expect(mockDownloadImage).toHaveBeenCalled();
		// Download fails -> result is undefined
		expect(result).toBeUndefined();
	});

	it("should return a ThumbHashResult on success", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);

		const imageBuffer = Buffer.from("fake-image-data");
		mockDownloadImage.mockResolvedValue(imageBuffer);

		setupSharpMock(80, 60);
		setupThumbhashMocks("data:image/png;base64,validHash");

		const result = await generateThumbHash("https://utfs.io/f/abc123.jpg");

		expect(result).not.toBeUndefined();
		expect(result).toMatchObject({
			hash: expect.any(String),
			dataUrl: "data:image/png;base64,validHash",
			width: 80,
			height: 60,
		});
	});

	it("should return undefined and log a warning when downloadImage throws a generic error", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockDownloadImage.mockRejectedValue(new Error("Connection refused"));
		const customLog = vi.fn();

		const result = await generateThumbHash("https://utfs.io/f/abc123.jpg", {
			logWarning: customLog,
		});

		expect(result).toBeUndefined();
		expect(customLog).toHaveBeenCalledWith(
			"[ThumbHash] Generation echouee",
			expect.objectContaining({ error: "Connection refused" })
		);
	});

	it("should return undefined and log a timeout warning when an AbortError is thrown", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		const abortError = new Error("The operation was aborted");
		abortError.name = "AbortError";
		mockDownloadImage.mockRejectedValue(abortError);
		const customLog = vi.fn();

		const result = await generateThumbHash("https://utfs.io/f/abc123.jpg", {
			logWarning: customLog,
		});

		expect(result).toBeUndefined();
		expect(customLog).toHaveBeenCalledWith(
			"[ThumbHash] Timeout",
			expect.objectContaining({ timeoutMs: expect.any(Number) })
		);
	});

	it("should return undefined and log a warning when the generated data URL format is invalid", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockDownloadImage.mockResolvedValue(Buffer.from("fake-image-data"));
		setupSharpMock(80, 60);

		// Set an invalid data URL that does not start with "data:image/png;base64,"
		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/jpeg;base64,not-png");

		const customLog = vi.fn();

		const result = await generateThumbHash("https://utfs.io/f/abc123.jpg", {
			logWarning: customLog,
		});

		expect(result).toBeUndefined();
		expect(customLog).toHaveBeenCalledWith(
			"[ThumbHash] Format invalide genere",
			expect.objectContaining({ expected: expect.any(String) })
		);
	});

	it("should pass custom downloadTimeout and maxImageSize to downloadImage", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockDownloadImage.mockRejectedValue(new Error("fail"));

		await generateThumbHash("https://utfs.io/f/abc123.jpg", {
			downloadTimeout: 5000,
			maxImageSize: 1024,
		});

		expect(mockDownloadImage).toHaveBeenCalledWith(
			"https://utfs.io/f/abc123.jpg",
			expect.objectContaining({
				downloadTimeout: 5000,
				maxImageSize: 1024,
			})
		);
	});

	it("should pass custom maxSize to sharp resize", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockDownloadImage.mockResolvedValue(Buffer.from("fake-image-data"));
		setupSharpMock(50, 50);
		setupThumbhashMocks();

		await generateThumbHash("https://utfs.io/f/abc123.jpg", { maxSize: 50 });

		const mockResize = mockSharp.__mockResize as ReturnType<typeof vi.fn>;
		expect(mockResize).toHaveBeenCalledWith(50, 50, expect.any(Object));
	});

	it("should use a custom logWarning function instead of console.warn", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);
		const customLog = vi.fn();
		const consoleSpy = vi.spyOn(console, "warn");

		await generateThumbHash("https://evil.com/image.jpg", { logWarning: customLog });

		expect(customLog).toHaveBeenCalled();
		expect(consoleSpy).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should use THUMBHASH_CONFIG defaults when no options are provided", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockDownloadImage.mockRejectedValue(new Error("fail"));

		await generateThumbHash("https://utfs.io/f/abc123.jpg");

		expect(mockDownloadImage).toHaveBeenCalledWith(
			"https://utfs.io/f/abc123.jpg",
			expect.objectContaining({
				downloadTimeout: THUMBHASH_CONFIG.downloadTimeout,
				maxImageSize: THUMBHASH_CONFIG.maxImageSize,
			})
		);
	});
});

// ============================================================================
// generateThumbHashWithRetry
// ============================================================================

describe("generateThumbHashWithRetry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTruncateUrl.mockImplementation((url: string) => url);
	});

	it("should throw when domain validation fails for a non-UploadThing URL", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);

		await expect(
			generateThumbHashWithRetry("https://evil.com/image.jpg")
		).rejects.toThrow("Domaine non autorise");
	});

	it("should not call withRetry when domain validation fails", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);

		await expect(
			generateThumbHashWithRetry("https://evil.com/image.jpg")
		).rejects.toThrow();

		expect(mockWithRetry).not.toHaveBeenCalled();
	});

	it("should call withRetry with the correct retry config", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		const fakeResult = {
			hash: "abc",
			dataUrl: "data:image/png;base64,abc",
			width: 80,
			height: 60,
		};
		mockWithRetry.mockResolvedValue(fakeResult);

		const result = await generateThumbHashWithRetry("https://utfs.io/f/abc123.jpg");

		expect(mockWithRetry).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				maxRetries: THUMBHASH_CONFIG.maxRetries,
				baseDelay: THUMBHASH_CONFIG.retryBaseDelay,
			})
		);
		expect(result).toEqual(fakeResult);
	});

	it("should throw if withRetry throws (all retries exhausted)", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);
		mockWithRetry.mockRejectedValue(new Error("All retries failed"));

		await expect(
			generateThumbHashWithRetry("https://utfs.io/f/abc123.jpg")
		).rejects.toThrow("All retries failed");
	});

	it("should pass custom maxSize option to the retry callback", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);

		// Capture the callback passed to withRetry and invoke it to verify behavior
		let capturedCallback: (() => Promise<unknown>) | null = null;
		mockWithRetry.mockImplementation(async (fn) => {
			capturedCallback = fn as () => Promise<unknown>;
			return fn();
		});

		mockDownloadImage.mockResolvedValue(Buffer.from("fake-image-data"));
		setupSharpMock(50, 50);
		setupThumbhashMocks();

		await generateThumbHashWithRetry("https://utfs.io/f/abc123.jpg", { maxSize: 50 });

		expect(capturedCallback).not.toBeNull();
		const mockResize = mockSharp.__mockResize as ReturnType<typeof vi.fn>;
		expect(mockResize).toHaveBeenCalledWith(50, 50, expect.any(Object));
	});

	it("should throw with an invalid ThumbHash data URL format", async () => {
		mockIsValidUploadThingUrl.mockReturnValue(true);

		// Make withRetry actually execute the callback
		mockWithRetry.mockImplementation(async (fn) => fn());
		mockDownloadImage.mockResolvedValue(Buffer.from("fake-image-data"));
		setupSharpMock(80, 60);

		// Return an invalid data URL
		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/jpeg;base64,not-png");

		await expect(
			generateThumbHashWithRetry("https://utfs.io/f/abc123.jpg")
		).rejects.toThrow("Format de ThumbHash invalide genere");
	});
});

// ============================================================================
// generateThumbHashFromBuffer
// ============================================================================

describe("generateThumbHashFromBuffer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should throw when the buffer exceeds the default maxImageSize", async () => {
		// Create a buffer larger than THUMBHASH_CONFIG.maxImageSize
		const oversizedBuffer = Buffer.alloc(THUMBHASH_CONFIG.maxImageSize + 1);

		await expect(generateThumbHashFromBuffer(oversizedBuffer)).rejects.toThrow(
			"Image trop volumineuse"
		);
	});

	it("should throw when the buffer exceeds a custom maxImageSize", async () => {
		const maxImageSize = 1024;
		const oversizedBuffer = Buffer.alloc(maxImageSize + 1);

		await expect(
			generateThumbHashFromBuffer(oversizedBuffer, { maxImageSize })
		).rejects.toThrow("Image trop volumineuse");
	});

	it("should return a ThumbHashResult on success", async () => {
		const imageBuffer = Buffer.alloc(1024); // Well within the default limit
		setupSharpMock(80, 60);
		setupThumbhashMocks("data:image/png;base64,validHash");

		const result = await generateThumbHashFromBuffer(imageBuffer);

		expect(result).toMatchObject({
			hash: expect.any(String),
			dataUrl: "data:image/png;base64,validHash",
			width: 80,
			height: 60,
		});
	});

	it("should encode the hash bytes as a base64 string", async () => {
		const imageBuffer = Buffer.alloc(1024);
		setupSharpMock(80, 60);

		const fakeHashBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		mockRgbaToThumbHash.mockReturnValue(fakeHashBytes);
		mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,abc");

		const result = await generateThumbHashFromBuffer(imageBuffer);

		expect(result.hash).toBe(Buffer.from(fakeHashBytes).toString("base64"));
	});

	it("should throw when the generated data URL format is invalid", async () => {
		const imageBuffer = Buffer.alloc(1024);
		setupSharpMock(80, 60);

		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/jpeg;base64,not-png");

		await expect(generateThumbHashFromBuffer(imageBuffer)).rejects.toThrow(
			"Format de ThumbHash invalide genere"
		);
	});

	it("should use THUMBHASH_CONFIG.maxSize by default for sharp resize", async () => {
		const imageBuffer = Buffer.alloc(1024);
		setupSharpMock(80, 60);
		setupThumbhashMocks();

		await generateThumbHashFromBuffer(imageBuffer);

		const mockResize = mockSharp.__mockResize as ReturnType<typeof vi.fn>;
		expect(mockResize).toHaveBeenCalledWith(
			THUMBHASH_CONFIG.maxSize,
			THUMBHASH_CONFIG.maxSize,
			expect.any(Object)
		);
	});

	it("should use a custom maxSize option for sharp resize", async () => {
		const imageBuffer = Buffer.alloc(1024);
		setupSharpMock(50, 50);
		setupThumbhashMocks();

		await generateThumbHashFromBuffer(imageBuffer, { maxSize: 50 });

		const mockResize = mockSharp.__mockResize as ReturnType<typeof vi.fn>;
		expect(mockResize).toHaveBeenCalledWith(50, 50, expect.any(Object));
	});

	it("should not call downloadImage (no network I/O for buffer-based generation)", async () => {
		const imageBuffer = Buffer.alloc(1024);
		setupSharpMock(80, 60);
		setupThumbhashMocks();

		await generateThumbHashFromBuffer(imageBuffer);

		expect(mockDownloadImage).not.toHaveBeenCalled();
	});
});
