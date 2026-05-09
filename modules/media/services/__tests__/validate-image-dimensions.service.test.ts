import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockDownloadImage, mockSharp, mockMetadata } = vi.hoisted(() => ({
	mockDownloadImage: vi.fn(),
	mockSharp: vi.fn(),
	mockMetadata: vi.fn(),
}));

vi.mock("sharp", () => ({ default: mockSharp }));

vi.mock("../image-downloader.service", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, downloadImage: mockDownloadImage };
});

vi.mock("@/modules/media/utils/validate-media-file", () => ({
	isValidUploadThingUrl: vi.fn(),
}));

import {
	ImageDimensionsTooLargeError,
	MAX_IMAGE_PIXELS,
	validateImageDimensions,
} from "../validate-image-dimensions.service";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";

const VALID_URL = "https://utfs.io/f/abc123.jpg";

function setupSharp(width: number | undefined, height: number | undefined) {
	mockMetadata.mockResolvedValue({ width, height });
	mockSharp.mockReturnValue({ metadata: mockMetadata });
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
	mockDownloadImage.mockResolvedValue(Buffer.alloc(1024));
});

describe("validateImageDimensions", () => {
	it("returns dimensions for a normal-sized image", async () => {
		setupSharp(1920, 1080);

		const result = await validateImageDimensions(VALID_URL);

		expect(result).toEqual({ width: 1920, height: 1080 });
	});

	it("rejects an image-bomb (50000x50000 = 2.5 G pixels)", async () => {
		setupSharp(50_000, 50_000);

		await expect(validateImageDimensions(VALID_URL)).rejects.toBeInstanceOf(
			ImageDimensionsTooLargeError,
		);
	});

	it("accepts an image right at the 50 MP limit", async () => {
		// Exactly 50 MP — must be accepted (boundary inclusive)
		setupSharp(10_000, 5_000);

		const result = await validateImageDimensions(VALID_URL);

		expect(result.width * result.height).toBe(MAX_IMAGE_PIXELS);
	});

	it("rejects an image one pixel over the limit", async () => {
		setupSharp(10_001, 5_000);

		await expect(validateImageDimensions(VALID_URL)).rejects.toBeInstanceOf(
			ImageDimensionsTooLargeError,
		);
	});

	it("respects a custom maxPixels threshold", async () => {
		setupSharp(2000, 2000); // 4 MP

		await expect(validateImageDimensions(VALID_URL, 1_000_000)).rejects.toBeInstanceOf(
			ImageDimensionsTooLargeError,
		);
	});

	it("rejects URLs from non-UploadThing domains (SSRF protection)", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(false);

		await expect(validateImageDimensions("https://evil.example/x.jpg")).rejects.toThrow(
			/Domaine non autorisé/,
		);
		expect(mockDownloadImage).not.toHaveBeenCalled();
	});

	it("throws when sharp cannot read dimensions", async () => {
		setupSharp(undefined, undefined);

		await expect(validateImageDimensions(VALID_URL)).rejects.toThrow(
			/Impossible de lire les dimensions/,
		);
	});

	it("throws when width is 0 (corrupted header)", async () => {
		setupSharp(0, 1080);

		await expect(validateImageDimensions(VALID_URL)).rejects.toThrow(
			/Impossible de lire les dimensions/,
		);
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
