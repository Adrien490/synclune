import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compressImage, HeicDecodeError, isHeicFile, prefersReducedData } from "../compress-image";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFile(name: string, size: number, type: string): File {
	return new File([new ArrayBuffer(size)], name, { type });
}

describe("isHeicFile", () => {
	it("detects HEIC MIME types", () => {
		expect(isHeicFile(createFile("a.heic", 100, "image/heic"))).toBe(true);
		expect(isHeicFile(createFile("a.heif", 100, "image/heif"))).toBe(true);
	});

	it("detects HEIC extensions without MIME", () => {
		expect(isHeicFile(createFile("photo.HEIC", 100, ""))).toBe(true);
		expect(isHeicFile(createFile("photo.heif", 100, ""))).toBe(true);
	});

	it("returns false for non-HEIC files", () => {
		expect(isHeicFile(createFile("a.jpg", 100, "image/jpeg"))).toBe(false);
		expect(isHeicFile(createFile("a.png", 100, "image/png"))).toBe(false);
	});
});

describe("prefersReducedData", () => {
	const originalNavigator = globalThis.navigator;

	afterEach(() => {
		Object.defineProperty(globalThis, "navigator", {
			value: originalNavigator,
			configurable: true,
		});
	});

	it("returns true when navigator.connection.saveData is true", () => {
		Object.defineProperty(globalThis, "navigator", {
			value: { connection: { saveData: true } },
			configurable: true,
		});
		expect(prefersReducedData()).toBe(true);
	});

	it("returns false when saveData is false", () => {
		Object.defineProperty(globalThis, "navigator", {
			value: { connection: { saveData: false } },
			configurable: true,
		});
		expect(prefersReducedData()).toBe(false);
	});

	it("returns false when connection API is absent", () => {
		Object.defineProperty(globalThis, "navigator", {
			value: {},
			configurable: true,
		});
		expect(prefersReducedData()).toBe(false);
	});
});

describe("compressImage", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("skips files smaller than 1MB (no compression needed)", async () => {
		const file = createFile("tiny.jpg", 500 * 1024, "image/jpeg");
		const result = await compressImage(file);
		expect(result.compressed).toBe(false);
		expect(result.file).toBe(file);
		expect(result.originalSize).toBe(500 * 1024);
		expect(result.finalSize).toBe(500 * 1024);
	});

	it("returns the original file when createImageBitmap is unavailable", async () => {
		const file = createFile("big.jpg", 2 * 1024 * 1024, "image/jpeg");
		// In jsdom there is no createImageBitmap — ensure the happy-path fallback
		const result = await compressImage(file);
		expect(result.compressed).toBe(false);
		expect(result.file).toBe(file);
	});

	it("throws HeicDecodeError when HEIC decoding fails", async () => {
		const file = createFile("photo.heic", 2 * 1024 * 1024, "image/heic");
		vi.stubGlobal(
			"createImageBitmap",
			vi.fn(() => Promise.reject(new DOMException("Decode failed"))),
		);
		vi.stubGlobal("OffscreenCanvas", class {});
		await expect(compressImage(file)).rejects.toThrow(HeicDecodeError);
		vi.unstubAllGlobals();
	});

	it("propagates non-HEIC decode errors", async () => {
		const file = createFile("broken.png", 2 * 1024 * 1024, "image/png");
		const specificError = new Error("Decode failure");
		vi.stubGlobal(
			"createImageBitmap",
			vi.fn(() => Promise.reject(specificError)),
		);
		vi.stubGlobal("OffscreenCanvas", class {});
		await expect(compressImage(file)).rejects.toThrow("Decode failure");
		vi.unstubAllGlobals();
	});
});

describe("HeicDecodeError", () => {
	it("carries the file name", () => {
		const err = new HeicDecodeError("IMG_1234.heic");
		expect(err.fileName).toBe("IMG_1234.heic");
		expect(err.name).toBe("HeicDecodeError");
		expect(err.message).toContain("IMG_1234.heic");
		expect(err.message).toContain("Le plus compatible");
	});
});
