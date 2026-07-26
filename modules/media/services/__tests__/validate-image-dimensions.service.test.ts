import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockSharp, mockMetadata } = vi.hoisted(() => ({
	mockSharp: vi.fn(),
	mockMetadata: vi.fn(),
}));

vi.mock("sharp", () => ({ default: mockSharp }));

import {
	ImageDimensionsTooLargeError,
	MAX_IMAGE_PIXELS,
	assertImageDimensions,
} from "../validate-image-dimensions.service";
import { ImageDecodeError } from "../image-downloader.service";

const BUFFER = Buffer.alloc(1024);

function setupSharp(width: number | undefined, height: number | undefined) {
	mockMetadata.mockResolvedValue({ width, height });
	mockSharp.mockReturnValue({ metadata: mockMetadata });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("assertImageDimensions", () => {
	it("returns dimensions for a normal-sized image", async () => {
		setupSharp(1920, 1080);

		const result = await assertImageDimensions(BUFFER);

		expect(result).toEqual({ width: 1920, height: 1080 });
	});

	it("rejects an image-bomb (50000x50000 = 2.5 G pixels)", async () => {
		setupSharp(50_000, 50_000);

		await expect(assertImageDimensions(BUFFER)).rejects.toBeInstanceOf(
			ImageDimensionsTooLargeError,
		);
	});

	it("accepts an image right at the 50 MP limit", async () => {
		// Exactly 50 MP — must be accepted (boundary inclusive)
		setupSharp(10_000, 5_000);

		const result = await assertImageDimensions(BUFFER);

		expect(result.width * result.height).toBe(MAX_IMAGE_PIXELS);
	});

	it("rejects an image one pixel over the limit", async () => {
		setupSharp(10_001, 5_000);

		await expect(assertImageDimensions(BUFFER)).rejects.toBeInstanceOf(
			ImageDimensionsTooLargeError,
		);
	});

	it("respects a custom maxPixels threshold", async () => {
		setupSharp(2000, 2000); // 4 MP

		await expect(assertImageDimensions(BUFFER, 1_000_000)).rejects.toBeInstanceOf(
			ImageDimensionsTooLargeError,
		);
	});

	// Audit média M1 : ces deux cas DOIVENT être des ImageDecodeError et non des
	// Error génériques — le route handler ne rejette l'upload que sur ce type.
	it("throws ImageDecodeError when sharp cannot read dimensions", async () => {
		setupSharp(undefined, undefined);

		await expect(assertImageDimensions(BUFFER)).rejects.toBeInstanceOf(ImageDecodeError);
	});

	it("throws ImageDecodeError when width is 0 (corrupted header)", async () => {
		setupSharp(0, 1080);

		await expect(assertImageDimensions(BUFFER)).rejects.toBeInstanceOf(ImageDecodeError);
	});

	it("throws ImageDecodeError when sharp itself throws (spoofed MIME)", async () => {
		mockMetadata.mockRejectedValue(new Error("Input buffer contains unsupported image format"));
		mockSharp.mockReturnValue({ metadata: mockMetadata });

		await expect(assertImageDimensions(BUFFER)).rejects.toBeInstanceOf(ImageDecodeError);
	});
});

describe("ImageDimensionsTooLargeError", () => {
	it("exposes width, height and maxPixels for telemetry", () => {
		const err = new ImageDimensionsTooLargeError(50_000, 50_000, MAX_IMAGE_PIXELS);

		expect(err.width).toBe(50_000);
		expect(err.height).toBe(50_000);
		expect(err.maxPixels).toBe(MAX_IMAGE_PIXELS);
		expect(err.name).toBe("ImageDimensionsTooLargeError");
		expect(err.message).toContain("50000×50000");
	});
});
