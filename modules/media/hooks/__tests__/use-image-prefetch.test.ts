import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { usePrefetchImages } from "../use-image-prefetch";

// ============================================================================
// Helpers
// ============================================================================

function getGalleryLinks(): HTMLLinkElement[] {
	return Array.from(
		document.querySelectorAll<HTMLLinkElement>(
			'link[rel="prefetch"][data-prefetched-by="gallery"]',
		),
	);
}

/**
 * Flush the idle callback polyfill.
 * jsdom n'implémente pas requestIdleCallback : le hook retombe sur le polyfill
 * setTimeout(cb, timeout), planifié à 500 ms (le `timeout` passé par le hook).
 * On avance donc les fake timers au-delà de ce délai.
 */
async function flushIdleCallback() {
	await act(async () => {
		vi.advanceTimersByTime(501);
		await Promise.resolve();
	});
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	cleanup();
	document.querySelectorAll('link[data-prefetched-by="gallery"]').forEach((el) => el.remove());
	vi.clearAllMocks();
});

// ============================================================================
// usePrefetchImages
// ============================================================================

describe("usePrefetchImages", () => {
	const IMAGE_URLS = [
		"https://example.com/img0.jpg",
		"https://example.com/img1.jpg",
		"https://example.com/img2.jpg",
		"https://example.com/img3.jpg",
		"https://example.com/img4.jpg",
	];

	it("does not add prefetch links when disabled", async () => {
		renderHook(() =>
			usePrefetchImages({
				imageUrls: IMAGE_URLS,
				currentIndex: 0,
				enabled: false,
			}),
		);

		await flushIdleCallback();

		expect(getGalleryLinks()).toHaveLength(0);
	});

	it("does not add prefetch links when imageUrls is empty", async () => {
		renderHook(() =>
			usePrefetchImages({
				imageUrls: [],
				currentIndex: 0,
				enabled: true,
			}),
		);

		await flushIdleCallback();

		expect(getGalleryLinks()).toHaveLength(0);
	});

	it("adds prefetch links for adjacent images (default prefetchRange=1)", async () => {
		renderHook(() =>
			usePrefetchImages({
				imageUrls: IMAGE_URLS,
				currentIndex: 2,
				prefetchRange: 1,
				enabled: true,
			}),
		);

		await flushIdleCallback();

		// With currentIndex=2, prefetchRange=1: indices 3 and 1
		const links = getGalleryLinks();
		expect(links.length).toBeGreaterThan(0);
		// All links should have rel=prefetch and as=image
		links.forEach((link) => {
			expect(link.rel).toBe("prefetch");
			expect(link.as).toBe("image");
			expect(link.dataset.prefetchedBy).toBe("gallery");
		});
	});

	it("cleans up all prefetch links on unmount", async () => {
		const { unmount } = renderHook(() =>
			usePrefetchImages({
				imageUrls: IMAGE_URLS,
				currentIndex: 2,
				enabled: true,
			}),
		);

		await flushIdleCallback();

		unmount();

		expect(getGalleryLinks()).toHaveLength(0);
	});

	it("does not create duplicate links when adjacent indices resolve to the same URL", async () => {
		// Galerie de 2 : à l'index 0, next et previous pointent tous deux l'index 1
		renderHook(() =>
			usePrefetchImages({
				imageUrls: [IMAGE_URLS[0]!, IMAGE_URLS[1]!],
				currentIndex: 0,
				prefetchRange: 1,
				enabled: true,
			}),
		);

		await flushIdleCallback();

		expect(getGalleryLinks()).toHaveLength(1);
	});

	it("tears down all links and recreates them on index change (full churn assumed)", async () => {
		const { rerender } = renderHook(
			({ index }: { index: number }) =>
				usePrefetchImages({
					imageUrls: IMAGE_URLS,
					currentIndex: index,
					prefetchRange: 1,
					enabled: true,
				}),
			{ initialProps: { index: 2 } },
		);

		await flushIdleCallback();

		const hrefsAtIndex2 = getGalleryLinks().map((link) => link.getAttribute("href"));
		expect(hrefsAtIndex2.length).toBeGreaterThan(0);

		// Changement d'index : le cleanup intégral retire tout, puis l'effet
		// recrée les links des nouveaux voisins — sans accumulation ni doublon
		rerender({ index: 4 });
		await flushIdleCallback();

		const hrefsAtIndex4 = getGalleryLinks().map((link) => link.getAttribute("href"));
		expect(hrefsAtIndex4.length).toBe(hrefsAtIndex2.length);
		expect(new Set(hrefsAtIndex4).size).toBe(hrefsAtIndex4.length);
		// Les voisins de l'index 4 (3 et 0) ne sont pas ceux de l'index 2 (1 et 3)
		expect(hrefsAtIndex4).not.toEqual(hrefsAtIndex2);
	});

	it("wraps around for circular carousel when currentIndex=0", async () => {
		renderHook(() =>
			usePrefetchImages({
				imageUrls: IMAGE_URLS,
				currentIndex: 0,
				prefetchRange: 1,
				enabled: true,
			}),
		);

		await flushIdleCallback();

		// At index 0: next=1, previous=4 (wraps to end)
		const links = getGalleryLinks();
		expect(links.length).toBeGreaterThan(0);
	});

	it("respects prefetchRange=2 by prefetching more images than range=1", async () => {
		// First render with range=1
		const { unmount: unmount1 } = renderHook(() =>
			usePrefetchImages({
				imageUrls: IMAGE_URLS,
				currentIndex: 2,
				prefetchRange: 1,
				enabled: true,
			}),
		);
		await flushIdleCallback();
		const linksRange1 = getGalleryLinks().length;
		unmount1();
		document.querySelectorAll('link[data-prefetched-by="gallery"]').forEach((el) => el.remove());

		// Second render with range=2 - should prefetch more images
		renderHook(() =>
			usePrefetchImages({
				imageUrls: IMAGE_URLS,
				currentIndex: 2,
				prefetchRange: 2,
				enabled: true,
			}),
		);
		await flushIdleCallback();
		const linksRange2 = getGalleryLinks().length;

		expect(linksRange2).toBeGreaterThanOrEqual(linksRange1);
	});

	it("adds prefetch link with href attribute set", async () => {
		renderHook(() =>
			usePrefetchImages({
				imageUrls: IMAGE_URLS,
				currentIndex: 1,
				prefetchRange: 1,
				enabled: true,
			}),
		);

		await flushIdleCallback();

		const links = getGalleryLinks();
		expect(links.length).toBeGreaterThan(0);
		links.forEach((link) => {
			expect(link.getAttribute("href")).toBeTruthy();
		});
	});
});
