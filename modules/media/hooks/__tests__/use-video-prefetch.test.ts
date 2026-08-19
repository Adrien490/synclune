import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ProductMedia } from "../../types/product-media.types";

// ============================================================================
// Helpers / Fixtures
// ============================================================================

function makeImageMedia(id: string): ProductMedia {
	return {
		id,
		url: `https://cdn.example.com/image-${id}.jpg`,
		alt: `Image ${id}`,
		type: "IMAGE",
	};
}

function makeVideoMedia(id: string, url?: string): ProductMedia {
	return {
		id,
		url: url ?? `https://cdn.example.com/video-${id}.mp4`,
		alt: `Video ${id}`,
		type: "VIDEO",
	};
}

// ============================================================================
// Import under test
// ============================================================================

import { usePrefetchVideos } from "../use-video-prefetch";

// ============================================================================
// Tests
// ============================================================================

describe("usePrefetchVideos", () => {
	let createdElements: HTMLVideoElement[];
	let originalCreateElement: typeof document.createElement;

	beforeEach(() => {
		createdElements = [];
		originalCreateElement = document.createElement.bind(document);

		// jsdom does not implement HTMLMediaElement.load() — stub it globally
		window.HTMLMediaElement.prototype.load = vi.fn();

		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "video") {
				const el = originalCreateElement("video") as HTMLVideoElement;
				createdElements.push(el);
				return el;
			}
			return originalCreateElement(tag);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		createdElements = [];
	});

	// --------------------------------------------------------------------------
	// No-op cases
	// --------------------------------------------------------------------------

	describe("no-op cases", () => {
		it("does not create any video elements when enabled is false", () => {
			const medias: ProductMedia[] = [makeVideoMedia("1"), makeVideoMedia("2")];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 0, enabled: false }));
			expect(createdElements).toHaveLength(0);
		});

		it("does not create any video elements when medias array is empty", () => {
			renderHook(() => usePrefetchVideos({ medias: [], currentIndex: 0, enabled: true }));
			expect(createdElements).toHaveLength(0);
		});

		it("does not create video elements for IMAGE media types", () => {
			const medias: ProductMedia[] = [
				makeImageMedia("img-a"),
				makeImageMedia("img-b"),
				makeImageMedia("img-c"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			expect(createdElements).toHaveLength(0);
		});

		it("does not create video elements when enabled defaults to true but no adjacent videos", () => {
			// Single image — no adjacent indices have videos
			const medias: ProductMedia[] = [makeImageMedia("img-1")];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 0 }));
			expect(createdElements).toHaveLength(0);
		});
	});

	// --------------------------------------------------------------------------
	// Prefetch range (default = 1)
	// --------------------------------------------------------------------------

	describe("prefetch range — default (1)", () => {
		it("prefetches one adjacent video on the right (currentIndex+1)", () => {
			const medias: ProductMedia[] = [
				makeImageMedia("img-0"),
				makeVideoMedia("vid-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 0, enabled: true }));
			// Adjacent: index 1 (video) and index -1 (wraps to 2, image)
			expect(createdElements).toHaveLength(1);
		});

		it("prefetches one adjacent video on the left (currentIndex-1)", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			// Adjacent: index 0 (video) and index 2 (image)
			expect(createdElements).toHaveLength(1);
		});

		it("prefetches both adjacent videos when both neighbours are videos", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeVideoMedia("vid-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			expect(createdElements).toHaveLength(2);
		});

		it("does not prefetch the current slide's video (only adjacent)", () => {
			const medias: ProductMedia[] = [
				makeImageMedia("img-0"),
				makeVideoMedia("current-vid"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			// Adjacent to index 1: indices 0 and 2 — both images
			expect(createdElements).toHaveLength(0);
		});
	});

	// --------------------------------------------------------------------------
	// Prefetch range (custom)
	// --------------------------------------------------------------------------

	describe("prefetch range — custom", () => {
		it("prefetches 2 items each side with prefetchRange=2", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeVideoMedia("vid-1"),
				makeImageMedia("img-2"), // current
				makeVideoMedia("vid-3"),
				makeVideoMedia("vid-4"),
			];
			renderHook(() =>
				usePrefetchVideos({ medias, currentIndex: 2, prefetchRange: 2, enabled: true }),
			);
			// Indices: +1=3 (video), -1=1 (video), +2=4 (video), -2=0 (video) => 4 videos
			expect(createdElements).toHaveLength(4);
		});

		it("prefetches 0 elements with prefetchRange=0", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeVideoMedia("vid-1"),
				makeVideoMedia("vid-2"),
			];
			renderHook(() =>
				usePrefetchVideos({ medias, currentIndex: 1, prefetchRange: 0, enabled: true }),
			);
			expect(createdElements).toHaveLength(0);
		});
	});

	// --------------------------------------------------------------------------
	// Video element configuration
	// --------------------------------------------------------------------------

	describe("video element configuration", () => {
		it("sets preload=metadata on created video elements", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			expect(createdElements[0]?.preload).toBe("metadata");
		});

		it("sets muted=true on created video elements", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			expect(createdElements[0]?.muted).toBe(true);
		});

		it("sets display=none on created video elements", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			expect(createdElements[0]?.style.display).toBe("none");
		});

		it("sets aria-hidden=true on created video elements", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			expect(createdElements[0]?.getAttribute("aria-hidden")).toBe("true");
		});

		it("assigns the correct src URL from the media to the video element", () => {
			const videoUrl = "https://cdn.example.com/video-special.mp4";
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0", videoUrl),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			expect(createdElements[0]?.src).toBe(videoUrl);
		});

		it("does not add video elements to the DOM", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			renderHook(() => usePrefetchVideos({ medias, currentIndex: 1, enabled: true }));
			// Video element should not be in the document body
			const allVideos = document.querySelectorAll("video");
			expect(allVideos).toHaveLength(0);
		});
	});

	// --------------------------------------------------------------------------
	// Circular carousel wrapping
	// --------------------------------------------------------------------------

	describe("circular carousel wrapping", () => {
		it("wraps around to the last index when currentIndex is 0 and prefetchRange=1", () => {
			const medias: ProductMedia[] = [
				makeImageMedia("img-0"), // current
				makeVideoMedia("vid-1"),
				makeVideoMedia("vid-last"), // index 2, wraps from -1
			];
			renderHook(() =>
				usePrefetchVideos({ medias, currentIndex: 0, prefetchRange: 1, enabled: true }),
			);
			// +1 → index 1 (video), -1 → index 2 (video, wraps)
			expect(createdElements).toHaveLength(2);
		});

		it("wraps around to the first index when currentIndex is last and prefetchRange=1", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"), // wraps from +1 of last
				makeImageMedia("img-1"),
				makeImageMedia("img-current"), // current = last
			];
			renderHook(() =>
				usePrefetchVideos({ medias, currentIndex: 2, prefetchRange: 1, enabled: true }),
			);
			// +1 → index 0 (video, wraps), -1 → index 1 (image)
			expect(createdElements).toHaveLength(1);
		});
	});

	// --------------------------------------------------------------------------
	// Deduplication — same URL not prefetched twice
	// --------------------------------------------------------------------------

	describe("deduplication", () => {
		it("does not create duplicate video elements for the same URL", () => {
			const sharedUrl = "https://cdn.example.com/shared.mp4";
			// With only 2 medias and range=1, both adjacent indices resolve to the same other item
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-a", sharedUrl),
				makeVideoMedia("vid-b", sharedUrl),
			];
			renderHook(() =>
				usePrefetchVideos({ medias, currentIndex: 0, prefetchRange: 1, enabled: true }),
			);
			// index 0 is current. +1 → index 1 (sharedUrl), -1 → index 1 (wraps, sharedUrl)
			// Both map to same URL → only one element created
			expect(createdElements).toHaveLength(1);
		});
	});

	// --------------------------------------------------------------------------
	// Cleanup on unmount
	// --------------------------------------------------------------------------

	describe("cleanup on unmount", () => {
		it("clears video src on unmount by setting it to empty string", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			const { unmount } = renderHook(() =>
				usePrefetchVideos({ medias, currentIndex: 1, enabled: true }),
			);

			const video = createdElements[0];
			expect(video).toBeDefined();

			// Spy on the src property setter to detect when it is set to ""
			const srcValues: string[] = [];
			const originalSrcDescriptor = Object.getOwnPropertyDescriptor(
				HTMLMediaElement.prototype,
				"src",
			);
			Object.defineProperty(video, "src", {
				set(value: string) {
					srcValues.push(value);
					// Also forward to the original setter if available
					originalSrcDescriptor?.set?.call(this, value);
				},
				get() {
					return originalSrcDescriptor?.get?.call(this) ?? "";
				},
				configurable: true,
			});

			unmount();

			// The hook sets video.src = "" during cleanup
			expect(srcValues).toContain("");
		});

		it("calls video.load() after clearing src on unmount", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
			];
			const { unmount } = renderHook(() =>
				usePrefetchVideos({ medias, currentIndex: 1, enabled: true }),
			);

			const video = createdElements[0];
			expect(video).toBeDefined();

			// load() is already stubbed in beforeEach
			unmount();

			expect(video?.load).toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// Index change — full teardown then recreation (churn assumed, HTTP cache
	// amortit ; cf. commentaire du cleanup dans le hook)
	// --------------------------------------------------------------------------

	describe("index change", () => {
		it("recreates a fresh element for a still-adjacent video after index change", () => {
			const medias: ProductMedia[] = [
				makeImageMedia("img-0"),
				makeImageMedia("img-1"),
				makeVideoMedia("vid-2"),
			];

			const { rerender } = renderHook(
				({ currentIndex }: { currentIndex: number }) =>
					usePrefetchVideos({ medias, currentIndex, enabled: true }),
				{ initialProps: { currentIndex: 0 } },
			);

			// At index 0, adjacent: index 1 (image) and index 2 (video, wraps) — 1 video
			expect(createdElements).toHaveLength(1);

			// Move to index 1, adjacent: index 0 (image) and index 2 (video).
			// Cleanup intégral puis recréation : un NOUVEL élément est créé pour
			// vid-2 même s'il était déjà préchargé (churn assumé)
			rerender({ currentIndex: 1 });

			expect(createdElements).toHaveLength(2);
		});

		it("clears every prefetched video on index change (full teardown)", () => {
			const medias: ProductMedia[] = [
				makeVideoMedia("vid-0"),
				makeImageMedia("img-1"),
				makeImageMedia("img-2"),
				makeVideoMedia("vid-3"),
			];

			const clearSrcSpy = vi.fn();

			const { rerender } = renderHook(
				({ currentIndex }: { currentIndex: number }) =>
					usePrefetchVideos({ medias, currentIndex, enabled: true }),
				{ initialProps: { currentIndex: 1 } },
			);

			// At index 1: adjacent index 0 (video) and index 2 (image) → 1 video element
			const firstVideo = createdElements[0];
			expect(firstVideo).toBeDefined();

			// Spy on src setter to detect cleanup
			Object.defineProperty(firstVideo, "src", {
				set: clearSrcSpy,
				get: () => "",
				configurable: true,
			});

			// Move to index 2: the effect cleanup tears down vid-0's element…
			rerender({ currentIndex: 2 });

			expect(clearSrcSpy).toHaveBeenCalledWith("");
			expect(firstVideo?.load).toHaveBeenCalled();
			// …and a fresh element is created for the newly adjacent vid-3
			expect(createdElements).toHaveLength(2);
			expect(createdElements[1]?.src).toBe("https://cdn.example.com/video-vid-3.mp4");
		});
	});
});
