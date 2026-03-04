import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

vi.mock("../constants/media.constants", () => ({
	CLIENT_THUMBNAIL_CONFIG: {
		width: 480,
		quality: 0.8,
		maxCaptureTime: 1,
		blurSize: 10,
		format: "image/jpeg",
	},
	THUMBNAIL_CONFIG: { maxCaptureTime: 1 },
	VIDEO_EVENT_TIMEOUTS: {
		DEFAULT_MS: 5000,
		LOADED_METADATA_MS: 10000,
		SEEKED_MS: 5000,
	},
	FRAME_VALIDATION: {
		MAX_SAMPLE_SIZE: 50,
		SAMPLE_FACTOR: 16,
		BLACK_THRESHOLD: 20,
		WHITE_THRESHOLD: 235,
		INVALID_PIXEL_RATIO: 0.95,
	},
	UI_DELAYS: { VIDEO_FRAME_STABILIZATION_MS: 50 },
}));

// ============================================================================
// Tests: isThumbnailGenerationSupported
// ============================================================================

describe("isThumbnailGenerationSupported", () => {
	let originalDocument: typeof globalThis.document;

	beforeEach(() => {
		originalDocument = globalThis.document;
		// Reset the cached value by reimporting (cache is module-level)
	});

	afterEach(() => {
		// Restore document
		Object.defineProperty(globalThis, "document", {
			value: originalDocument,
			writable: true,
			configurable: true,
		});
	});

	it("returns false when document is undefined (SSR)", async () => {
		// We need a fresh module to reset the cache
		vi.resetModules();

		// Temporarily remove document
		const savedDoc = globalThis.document;
		// @ts-expect-error -- simulating SSR
		delete globalThis.document;

		const mod = await import("../use-video-thumbnail");
		const result = mod.isThumbnailGenerationSupported();

		expect(result).toBe(false);

		// Restore
		Object.defineProperty(globalThis, "document", {
			value: savedDoc,
			writable: true,
			configurable: true,
		});
	});
});

// ============================================================================
// Tests: generateVideoThumbnail
// ============================================================================

describe("generateVideoThumbnail", () => {
	it("throws when signal is already aborted", async () => {
		// Need to ensure isThumbnailGenerationSupported returns true
		vi.resetModules();

		const mod = await import("../use-video-thumbnail");

		// Mock document.createElement to make canvas support check pass
		const mockCanvas = { getContext: () => ({}) };
		const origCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
			return origCreateElement(tag);
		});

		const controller = new AbortController();
		controller.abort();

		const file = new File(["video content"], "test.mp4", { type: "video/mp4" });

		await expect(mod.generateVideoThumbnail(file, { signal: controller.signal })).rejects.toThrow(
			"Operation annulee",
		);

		vi.restoreAllMocks();
	});

	it("throws when canvas is not supported", async () => {
		vi.resetModules();

		// Mock document.createElement to return a canvas without 2d context
		const mockCanvas = { getContext: () => null };
		const origCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
			return origCreateElement(tag);
		});

		const mod = await import("../use-video-thumbnail");
		const file = new File(["video content"], "test.mp4", { type: "video/mp4" });

		await expect(mod.generateVideoThumbnail(file)).rejects.toThrow(
			"Canvas 2D non supporte par ce navigateur",
		);

		vi.restoreAllMocks();
	});
});
