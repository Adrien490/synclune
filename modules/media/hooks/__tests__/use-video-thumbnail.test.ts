import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks for constants
// ============================================================================

vi.mock("../../constants/thumbnail.constants", () => ({
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
}));

vi.mock("../../constants/ui-interactions.constants", () => ({
	UI_DELAYS: { VIDEO_FRAME_STABILIZATION_MS: 0 },
}));

// ============================================================================
// Tests: isThumbnailGenerationSupported
// ============================================================================

describe("isThumbnailGenerationSupported", () => {
	let originalDocument: typeof globalThis.document;

	beforeEach(() => {
		originalDocument = globalThis.document;
	});

	afterEach(() => {
		Object.defineProperty(globalThis, "document", {
			value: originalDocument,
			writable: true,
			configurable: true,
		});
	});

	it("returns false when document is undefined (SSR)", async () => {
		vi.resetModules();

		const savedDoc = globalThis.document;
		// @ts-expect-error -- simulating SSR
		delete globalThis.document;

		const mod = await import("../use-video-thumbnail");
		const result = mod.isThumbnailGenerationSupported();

		expect(result).toBe(false);

		Object.defineProperty(globalThis, "document", {
			value: savedDoc,
			writable: true,
			configurable: true,
		});
	});

	it("returns true when Canvas 2D is supported", async () => {
		vi.resetModules();

		const mod = await import("../use-video-thumbnail");
		const result = mod.isThumbnailGenerationSupported();

		// jsdom supports canvas context
		expect(typeof result).toBe("boolean");
	});

	it("caches the result across calls", async () => {
		vi.resetModules();

		const mod = await import("../use-video-thumbnail");
		const first = mod.isThumbnailGenerationSupported();
		const second = mod.isThumbnailGenerationSupported();

		expect(first).toBe(second);
	});
});

// ============================================================================
// Tests: generateVideoThumbnail
// ============================================================================

describe("generateVideoThumbnail", () => {
	it("throws when signal is already aborted", async () => {
		vi.resetModules();

		const mod = await import("../use-video-thumbnail");

		// Mock canvas support
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

	it("accepts custom capture positions", async () => {
		vi.resetModules();

		// Stub OffscreenCanvas for jsdom (not natively supported)
		if (typeof globalThis.OffscreenCanvas === "undefined") {
			// @ts-expect-error -- stub for jsdom
			globalThis.OffscreenCanvas = class OffscreenCanvas {
				width: number;
				height: number;
				constructor(w: number, h: number) {
					this.width = w;
					this.height = h;
				}
				getContext() {
					return null;
				}
			};
		}

		const mod = await import("../use-video-thumbnail");

		const origCreateElement = document.createElement.bind(document);

		// Create a real HTMLCanvasElement with mocked 2D context methods
		function createMockCanvas(): HTMLCanvasElement {
			const canvas = origCreateElement("canvas") as HTMLCanvasElement;
			const mockCtx = {
				drawImage: vi.fn(),
				getImageData: vi.fn(() => ({
					data: new Uint8ClampedArray(100 * 100 * 4).fill(128), // mid-gray = valid frame
				})),
			};
			vi.spyOn(canvas, "getContext").mockReturnValue(
				mockCtx as unknown as CanvasRenderingContext2D,
			);
			vi.spyOn(canvas, "toBlob").mockImplementation((cb: BlobCallback) => {
				cb(new Blob(["fake"], { type: "image/jpeg" }));
			});
			vi.spyOn(canvas, "toDataURL").mockReturnValue("data:image/jpeg;base64,fake");
			return canvas;
		}

		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "canvas") return createMockCanvas();
			if (tag === "video") {
				const video = origCreateElement("video") as HTMLVideoElement;
				// Mock video loading behavior
				Object.defineProperty(video, "videoWidth", { value: 1920, writable: true });
				Object.defineProperty(video, "videoHeight", { value: 1080, writable: true });
				Object.defineProperty(video, "duration", { value: 10, writable: true });
				Object.defineProperty(video, "readyState", { value: 4, writable: true });

				const origLoad = video.load.bind(video);
				video.load = () => {
					origLoad();
					// Simulate loadedmetadata event
					setTimeout(() => video.dispatchEvent(new Event("loadedmetadata")), 0);
				};

				// Simulate seeked event on currentTime change
				const origSet = Object.getOwnPropertyDescriptor(
					HTMLMediaElement.prototype,
					"currentTime",
				)?.set;
				Object.defineProperty(video, "currentTime", {
					set(val: number) {
						origSet?.call(video, val);
						setTimeout(() => video.dispatchEvent(new Event("seeked")), 0);
					},
					get() {
						return 0;
					},
				});

				return video;
			}
			return origCreateElement(tag);
		});

		// Mock URL.createObjectURL and revokeObjectURL
		const origCreateObjectURL = URL.createObjectURL;
		const origRevokeObjectURL = URL.revokeObjectURL;
		URL.createObjectURL = vi.fn(() => "blob:mock-url");
		URL.revokeObjectURL = vi.fn();

		const file = new File(["video content"], "test.mp4", { type: "video/mp4" });

		try {
			const result = await mod.generateVideoThumbnail(file, {
				capturePositions: [0.5],
			});

			expect(result).toHaveProperty("thumbnailFile");
			expect(result).toHaveProperty("previewUrl");
			expect(result).toHaveProperty("blurDataUrl");
			expect(result).toHaveProperty("capturedAt");
			expect(result.thumbnailFile).toBeInstanceOf(File);
			expect(result.thumbnailFile.type).toBe("image/jpeg");
			expect(result.thumbnailFile.name).toMatch(/^thumb-\d+-[a-z0-9]+\.jpg$/);
		} finally {
			URL.createObjectURL = origCreateObjectURL;
			URL.revokeObjectURL = origRevokeObjectURL;
			vi.restoreAllMocks();
		}
	});

	it("cleans up video resources on error", async () => {
		vi.resetModules();

		const mod = await import("../use-video-thumbnail");

		// Mock canvas support
		const mockCanvas = { getContext: () => ({}) };
		const origCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
			if (tag === "video") {
				const video = origCreateElement("video") as HTMLVideoElement;
				Object.defineProperty(video, "videoWidth", { value: 0, writable: true });
				Object.defineProperty(video, "videoHeight", { value: 0, writable: true });

				video.load = () => {
					setTimeout(() => video.dispatchEvent(new Event("loadedmetadata")), 0);
				};

				return video;
			}
			return origCreateElement(tag);
		});

		const revokeObjectURL = vi.fn();
		const origCreateObjectURL = URL.createObjectURL;
		const origRevokeObjectURL = URL.revokeObjectURL;
		URL.createObjectURL = vi.fn(() => "blob:mock-url");
		URL.revokeObjectURL = revokeObjectURL;

		const file = new File(["video content"], "test.mp4", { type: "video/mp4" });

		try {
			await expect(mod.generateVideoThumbnail(file)).rejects.toThrow("Dimensions video invalides");
			// Verify URL cleanup happened
			expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
		} finally {
			URL.createObjectURL = origCreateObjectURL;
			URL.revokeObjectURL = origRevokeObjectURL;
			vi.restoreAllMocks();
		}
	});

	it("aborts mid-generation when signal fires", async () => {
		vi.resetModules();

		const mod = await import("../use-video-thumbnail");

		const mockCanvas = { getContext: () => ({}) };
		const origCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
			if (tag === "video") {
				const video = origCreateElement("video") as HTMLVideoElement;
				Object.defineProperty(video, "videoWidth", { value: 1920, writable: true });
				Object.defineProperty(video, "videoHeight", { value: 1080, writable: true });
				Object.defineProperty(video, "duration", { value: 10, writable: true });

				// loadedmetadata fires but seeked never fires (simulates slow seek)
				video.load = () => {
					setTimeout(() => video.dispatchEvent(new Event("loadedmetadata")), 0);
				};

				return video;
			}
			return origCreateElement(tag);
		});

		const origCreateObjectURL = URL.createObjectURL;
		const origRevokeObjectURL = URL.revokeObjectURL;
		URL.createObjectURL = vi.fn(() => "blob:mock-url");
		URL.revokeObjectURL = vi.fn();

		const controller = new AbortController();
		const file = new File(["video content"], "test.mp4", { type: "video/mp4" });

		// Abort after metadata loads but before seeked
		const promise = mod.generateVideoThumbnail(file, { signal: controller.signal });

		// Wait a tick for loadedmetadata to fire, then abort
		await new Promise((r) => setTimeout(r, 10));
		controller.abort();

		try {
			await expect(promise).rejects.toThrow("Operation annulee");
		} finally {
			URL.createObjectURL = origCreateObjectURL;
			URL.revokeObjectURL = origRevokeObjectURL;
			vi.restoreAllMocks();
		}
	});
});
