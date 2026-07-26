import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockRgbaToThumbHash, mockThumbHashToDataURL, mockSharp } = vi.hoisted(() => {
	const mockSharpInstance = {
		ensureAlpha: vi.fn().mockReturnThis(),
		resize: vi.fn().mockReturnThis(),
		raw: vi.fn().mockReturnThis(),
		toBuffer: vi.fn(),
	};

	return {
		mockRgbaToThumbHash: vi.fn(),
		mockThumbHashToDataURL: vi.fn(),
		mockSharp: vi.fn(() => mockSharpInstance),
	};
});

vi.mock("sharp", () => ({ default: mockSharp }));

vi.mock("thumbhash", () => ({
	rgbaToThumbHash: mockRgbaToThumbHash,
	thumbHashToDataURL: mockThumbHashToDataURL,
}));

import { generateThumbHashFromBuffer } from "../generate-thumbhash";

// ============================================================================
// Setup
// ============================================================================

function makeBuffer(sizeBytes = 1024): Buffer {
	return Buffer.alloc(sizeBytes, 0xff);
}

function setupSharp(width: number, height: number) {
	const sharpInst = {
		ensureAlpha: vi.fn().mockReturnThis(),
		resize: vi.fn().mockReturnThis(),
		raw: vi.fn().mockReturnThis(),
		toBuffer: vi.fn().mockResolvedValue({
			data: Buffer.alloc(width * height * 4),
			info: { width, height },
		}),
	};
	mockSharp.mockReturnValue(sharpInst);
	return sharpInst;
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// generateThumbHashFromBuffer
//
// Audit média M6 : le service est buffer-only. Les anciennes variantes par URL
// (`generateThumbHash` / `generateThumbHashWithRetry`) re-téléchargeaient
// l'image — jusqu'à 3 fois par upload avec les retries — alors que le pipeline
// `onUploadComplete` détient déjà les octets.
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
		setupSharp(80, 60);

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

	it("calls rgbaToThumbHash with extracted width, height and rgba data", async () => {
		setupSharp(80, 60);
		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,ok==");

		await generateThumbHashFromBuffer(makeBuffer());

		expect(mockRgbaToThumbHash).toHaveBeenCalledWith(80, 60, expect.any(Uint8Array));
	});

	it("throws when thumbHashToDataURL returns an invalid format", async () => {
		setupSharp(80, 60);

		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/jpeg;base64,bad==");

		await expect(generateThumbHashFromBuffer(makeBuffer())).rejects.toThrow(
			"Format de ThumbHash invalide",
		);
	});

	it("passes custom maxSize to sharp resize", async () => {
		const sharpInst = setupSharp(50, 50);
		mockRgbaToThumbHash.mockReturnValue(new Uint8Array([1, 2, 3]));
		mockThumbHashToDataURL.mockReturnValue("data:image/png;base64,ok==");

		await generateThumbHashFromBuffer(makeBuffer(), { maxSize: 50 });

		expect(sharpInst.resize).toHaveBeenCalledWith(50, 50, expect.any(Object));
	});

	it("propagates a Sharp decode failure instead of swallowing it", async () => {
		mockSharp.mockReturnValue({
			ensureAlpha: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockRejectedValue(new Error("unsupported image format")),
		});

		await expect(generateThumbHashFromBuffer(makeBuffer())).rejects.toThrow(
			"unsupported image format",
		);
	});
});
