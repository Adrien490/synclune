import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockDownloadImage, mockRgbaToThumbHash, mockThumbHashToDataURL, mockSharp, mockLogger } =
	vi.hoisted(() => {
		const mockSharpInstance = {
			ensureAlpha: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn(),
		};

		return {
			mockDownloadImage: vi.fn(),
			mockRgbaToThumbHash: vi.fn(),
			mockThumbHashToDataURL: vi.fn(),
			mockSharp: vi.fn(() => mockSharpInstance),
			mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		};
	});

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("sharp", () => ({ default: mockSharp }));

vi.mock("thumbhash", () => ({
	rgbaToThumbHash: mockRgbaToThumbHash,
	thumbHashToDataURL: mockThumbHashToDataURL,
}));

vi.mock("../image-downloader.service", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		downloadImage: mockDownloadImage,
	};
});

vi.mock("@/modules/media/utils/validate-media-file", () => ({
	isValidUploadThingUrl: vi.fn(),
}));

import {
	generateThumbHash,
	generateThumbHashWithRetry,
	generateThumbHashFromBuffer,
} from "../generate-thumbhash";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";

// ============================================================================
// Setup
// ============================================================================

const VALID_URL = "https://utfs.io/f/abc123.jpg";

function makeBuffer(sizeBytes = 1024): Buffer {
	return Buffer.alloc(sizeBytes, 0xff);
}

function setupHappyPath() {
	vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
	mockDownloadImage.mockResolvedValue(makeBuffer());

	const sharpInst = {
		ensureAlpha: vi.fn().mockReturnThis(),
		resize: vi.fn().mockReturnThis(),
		raw: vi.fn().mockReturnThis(),
		toBuffer: vi.fn().mockResolvedValue({
			data: Buffer.alloc(100 * 75 * 4),
			info: { width: 100, height: 75 },
		}),
	};
	mockSharp.mockReturnValue(sharpInst);

	const hashBytes = new Uint8Array([1, 2, 3, 4]);
	mockRgbaToThumbHash.mockReturnValue(hashBytes);
	mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,abc123==");

	return { sharpInst, hashBytes };
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// generateThumbHash - URL validation
// ============================================================================

describe("generateThumbHash", () => {
	describe("URL validation", () => {
		it("returns undefined and logs a warning for a non-UploadThing URL", async () => {
			vi.mocked(isValidUploadThingUrl).mockReturnValue(false);
			const log = vi.fn();

			const result = await generateThumbHash("https://example.com/image.jpg", {
				logWarning: log,
			});

			expect(result).toBeUndefined();
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining("Domaine non autorise"),
				expect.objectContaining({ url: expect.any(String) }),
			);
			expect(mockDownloadImage).not.toHaveBeenCalled();
		});

		it("returns undefined for an HTTP (non-HTTPS) URL without calling downloadImage", async () => {
			vi.mocked(isValidUploadThingUrl).mockReturnValue(false);

			const result = await generateThumbHash("http://utfs.io/f/abc.jpg");

			expect(result).toBeUndefined();
			expect(mockDownloadImage).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// generateThumbHash - Download + RGBA extraction + hash generation
	// ============================================================================

	describe("happy path", () => {
		it("returns a ThumbHashResult with hash, dataUrl, width, height", async () => {
			const { hashBytes } = setupHappyPath();

			const result = await generateThumbHash(VALID_URL);

			expect(result).toEqual({
				hash: Buffer.from(hashBytes).toString("base64"),
				dataUrl: "data:image/png;base64,abc123==",
				width: 100,
				height: 75,
			});
		});

		it("calls downloadImage with the provided URL and user-agent header", async () => {
			setupHappyPath();

			await generateThumbHash(VALID_URL);

			expect(mockDownloadImage).toHaveBeenCalledWith(
				VALID_URL,
				expect.objectContaining({ userAgent: "Synclune-ThumbHash/1.0" }),
			);
		});

		it("calls rgbaToThumbHash with extracted width, height, and rgba data", async () => {
			const { sharpInst } = setupHappyPath();
			const rgba = Buffer.alloc(100 * 75 * 4);
			sharpInst.toBuffer.mockResolvedValue({
				data: rgba,
				info: { width: 100, height: 75 },
			});

			await generateThumbHash(VALID_URL);

			expect(mockRgbaToThumbHash).toHaveBeenCalledWith(100, 75, new Uint8Array(rgba));
		});

		it("passes custom maxSize to sharp resize", async () => {
			const { sharpInst } = setupHappyPath();

			await generateThumbHash(VALID_URL, { maxSize: 50 });

			expect(sharpInst.resize).toHaveBeenCalledWith(50, 50, expect.any(Object));
		});

		it("forwards custom downloadTimeout to downloadImage", async () => {
			setupHappyPath();

			await generateThumbHash(VALID_URL, { downloadTimeout: 5000 });

			expect(mockDownloadImage).toHaveBeenCalledWith(
				VALID_URL,
				expect.objectContaining({ downloadTimeout: 5000 }),
			);
		});
	});

	// ============================================================================
	// generateThumbHash - Invalid dataUrl
	// ============================================================================

	describe("invalid dataUrl", () => {
		it("returns undefined and logs a warning when thumbHashToDataURL returns unexpected format", async () => {
			setupHappyPath();
			mockThumbHashToDataURL.mockReturnValue("data:image/webp;base64,bad==");
			const log = vi.fn();

			const result = await generateThumbHash(VALID_URL, { logWarning: log });

			expect(result).toBeUndefined();
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining("Format invalide"),
				expect.any(Object),
			);
		});
	});

	// ============================================================================
	// generateThumbHash - Error handling
	// ============================================================================

	describe("error handling", () => {
		it("returns undefined and logs a timeout warning on AbortError", async () => {
			vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
			const abortError = Object.assign(new Error("Signal aborted"), { name: "AbortError" });
			mockDownloadImage.mockRejectedValue(abortError);
			const log = vi.fn();

			const result = await generateThumbHash(VALID_URL, { logWarning: log });

			expect(result).toBeUndefined();
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining("Timeout"),
				expect.objectContaining({ timeoutMs: expect.any(Number) }),
			);
		});

		it("returns undefined and logs a generic warning on download failure", async () => {
			vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
			mockDownloadImage.mockRejectedValue(new Error("Network failure"));
			const log = vi.fn();

			const result = await generateThumbHash(VALID_URL, { logWarning: log });

			expect(result).toBeUndefined();
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining("Generation echouee"),
				expect.objectContaining({ error: "Network failure" }),
			);
		});

		it("returns undefined and handles non-Error exceptions gracefully", async () => {
			vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
			mockDownloadImage.mockRejectedValue("string error");
			const log = vi.fn();

			const result = await generateThumbHash(VALID_URL, { logWarning: log });

			expect(result).toBeUndefined();
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining("Generation echouee"),
				expect.objectContaining({ error: "string error" }),
			);
		});
	});
});

// ============================================================================
// generateThumbHashWithRetry - URL validation + retry logic
// ============================================================================

describe("generateThumbHashWithRetry", () => {
	it("throws immediately for a non-UploadThing URL without retrying", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(false);

		await expect(generateThumbHashWithRetry("https://evil.com/image.jpg")).rejects.toThrow(
			"Domaine non autorise",
		);

		expect(mockDownloadImage).not.toHaveBeenCalled();
	});

	it("throws with the hostname in the error message", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(false);

		await expect(generateThumbHashWithRetry("https://evil.com/image.jpg")).rejects.toThrow(
			"evil.com",
		);
	});

	it("returns a ThumbHashResult on success", async () => {
		const { hashBytes } = setupHappyPath();

		const result = await generateThumbHashWithRetry(VALID_URL);

		expect(result).toEqual({
			hash: Buffer.from(hashBytes).toString("base64"),
			dataUrl: "data:image/png;base64,abc123==",
			width: 100,
			height: 75,
		});
	});

	it("retries on transient error and succeeds on second attempt", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(true);

		const sharpInst = {
			ensureAlpha: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockResolvedValue({
				data: Buffer.alloc(100 * 75 * 4),
				info: { width: 100, height: 75 },
			}),
		};
		mockSharp.mockReturnValue(sharpInst);

		const hashBytes = new Uint8Array([1, 2, 3, 4]);
		mockRgbaToThumbHash.mockReturnValue(hashBytes);
		mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,abc123==");

		mockDownloadImage
			.mockRejectedValueOnce(new Error("HTTP 500: Internal Server Error"))
			.mockResolvedValueOnce(makeBuffer());

		const result = await generateThumbHashWithRetry(VALID_URL, {
			downloadTimeout: 1000,
			maxImageSize: 1024 * 1024,
		});

		expect(mockDownloadImage).toHaveBeenCalledTimes(2);
		expect(result.hash).toBeDefined();
	});

	it("throws when generated dataUrl has invalid format", async () => {
		setupHappyPath();
		mockThumbHashToDataURL.mockReturnValue("data:image/webp;base64,bad==");

		await expect(generateThumbHashWithRetry(VALID_URL)).rejects.toThrow(
			"Format de ThumbHash invalide",
		);
	});
});

// ============================================================================
// generateThumbHashFromBuffer - size limit + valid output
// ============================================================================

describe("generateThumbHashFromBuffer", () => {
	it("throws when buffer exceeds maxImageSize", async () => {
		const oversizedBuffer = makeBuffer(5 * 1024 * 1024); // 5 MB

		await expect(
			generateThumbHashFromBuffer(oversizedBuffer, { maxImageSize: 1 * 1024 * 1024 }),
		).rejects.toThrow("Image trop volumineuse");
	});

	it("includes size details in the size-exceeded error message", async () => {
		const oversizedBuffer = makeBuffer(2 * 1024 * 1024); // 2 MB

		await expect(
			generateThumbHashFromBuffer(oversizedBuffer, { maxImageSize: 1 * 1024 * 1024 }),
		).rejects.toThrow("max: 1MB");
	});

	it("returns a ThumbHashResult with valid base64 hash and png dataUrl", async () => {
		const sharpInst = {
			ensureAlpha: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockResolvedValue({
				data: Buffer.alloc(80 * 60 * 4),
				info: { width: 80, height: 60 },
			}),
		};
		mockSharp.mockReturnValue(sharpInst);

		const hashBytes = new Uint8Array([10, 20, 30, 40]);
		mockRgbaToThumbHash.mockReturnValue(hashBytes);
		mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,dGVzdA==");

		const result = await generateThumbHashFromBuffer(makeBuffer());

		expect(result.hash).toBe(Buffer.from(hashBytes).toString("base64"));
		expect(result.dataUrl).toBe("data:image/png;base64,dGVzdA==");
		expect(result.width).toBe(80);
		expect(result.height).toBe(60);
		// hash must be valid base64
		expect(() => Buffer.from(result.hash, "base64")).not.toThrow();
	});

	it("throws when thumbHashToDataURL returns an invalid format", async () => {
		const sharpInst = {
			ensureAlpha: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockResolvedValue({
				data: Buffer.alloc(80 * 60 * 4),
				info: { width: 80, height: 60 },
			}),
		};
		mockSharp.mockReturnValue(sharpInst);

		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/jpeg;base64,bad==");

		await expect(generateThumbHashFromBuffer(makeBuffer())).rejects.toThrow(
			"Format de ThumbHash invalide",
		);
	});

	it("passes custom maxSize to sharp resize", async () => {
		const sharpInst = {
			ensureAlpha: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockResolvedValue({
				data: Buffer.alloc(50 * 50 * 4),
				info: { width: 50, height: 50 },
			}),
		};
		mockSharp.mockReturnValue(sharpInst);
		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,ok==");

		await generateThumbHashFromBuffer(makeBuffer(), { maxSize: 50 });

		expect(sharpInst.resize).toHaveBeenCalledWith(50, 50, expect.any(Object));
	});

	it("does not call downloadImage (no HTTP request for buffer input)", async () => {
		const sharpInst = {
			ensureAlpha: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockResolvedValue({
				data: Buffer.alloc(80 * 60 * 4),
				info: { width: 80, height: 60 },
			}),
		};
		mockSharp.mockReturnValue(sharpInst);
		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,ok==");

		await generateThumbHashFromBuffer(makeBuffer());

		expect(mockDownloadImage).not.toHaveBeenCalled();
	});
});
