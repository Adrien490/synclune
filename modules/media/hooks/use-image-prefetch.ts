"use client";

import { useEffect } from "react";
import {
	nextImageUrl,
	MAIN_IMAGE_QUALITY,
	PREFETCH_SIZE_MOBILE,
	PREFETCH_SIZE_DESKTOP,
} from "../constants/image-config.constants";

interface UsePrefetchImagesOptions {
	/** Image URLs to prefetch */
	imageUrls: string[];
	/** Current index in the carousel */
	currentIndex: number;
	/** Number of images to prefetch before and after the current index */
	prefetchRange?: number;
	/** Enable prefetch (disable to save bandwidth) */
	enabled?: boolean;
}

/**
 * Polyfill for requestIdleCallback (Safari, Edge < 79).
 * Uses setTimeout as a low-priority fallback.
 * Respects the timeout option for consistent behavior.
 * Note: In the browser, setTimeout returns a number, not a NodeJS.Timeout.
 */
const requestIdleCallbackPolyfill =
	typeof window !== "undefined" && "requestIdleCallback" in window
		? window.requestIdleCallback
		: (callback: IdleRequestCallback, options?: IdleRequestOptions): number => {
				const timeout = options?.timeout ?? 50;
				const start = Date.now();
				return window.setTimeout(() => {
					const elapsed = Date.now() - start;
					callback({
						didTimeout: elapsed >= timeout,
						timeRemaining: () => Math.max(0, 50 - elapsed),
					});
				}, Math.min(1, timeout));
			};

const cancelIdleCallbackPolyfill =
	typeof window !== "undefined" && "cancelIdleCallback" in window
		? window.cancelIdleCallback
		: (id: number) => window.clearTimeout(id);

/**
 * Determines the optimal image size to prefetch based on viewport.
 * Mobile (<768px): 640px - matches 375-430px viewports
 * Desktop (>=768px): 1080px - matches desktop viewports
 */
function getPrefetchImageSize(): number {
	if (typeof window === "undefined") return PREFETCH_SIZE_DESKTOP;
	return window.innerWidth < 768 ? PREFETCH_SIZE_MOBILE : PREFETCH_SIZE_DESKTOP;
}

/**
 * Hook for intelligent image prefetching in a carousel.
 *
 * Prefetch strategy (Next.js 16 + React 19 best practices):
 * 1. Prefetch adjacent images (next + previous)
 * 2. Uses requestIdleCallback to avoid blocking the main thread (with Safari polyfill)
 * 3. Creates <link rel="prefetch"> elements in the <head>
 * 4. Automatically cleans up unused prefetch links
 * 5. SSR protection (checks for window)
 * 6. XSS security (no injection in querySelector)
 *
 * @example
 * usePrefetchImages({
 *   imageUrls: gallery.map(img => img.url),
 *   currentIndex: 2,
 *   prefetchRange: 2, // Prefetch 2 images avant et après
 * })
 */
export function usePrefetchImages({
	imageUrls,
	currentIndex,
	prefetchRange = 1,
	enabled = true,
}: UsePrefetchImagesOptions) {
	useEffect(() => {
		// SSR protection: check that window exists
		if (typeof window === "undefined") return;
		if (!enabled || imageUrls.length === 0) return;

		// Calculate indices to prefetch (with wrapping for circular carousel)
		const indicesToPrefetch: number[] = [];
		for (let i = 1; i <= prefetchRange; i++) {
			// Next images
			indicesToPrefetch.push((currentIndex + i) % imageUrls.length);
			// Previous images
			indicesToPrefetch.push(
				(currentIndex - i + imageUrls.length) % imageUrls.length
			);
		}

		// Use requestIdleCallback with polyfill for Safari
		const prefetchId = requestIdleCallbackPolyfill(
			() => {
				for (const index of indicesToPrefetch) {
					const imageUrl = imageUrls[index];
					if (!imageUrl) continue;

					// Security: check if already prefetched without SQL/XSS injection
					// Retrieve all links and filter in JS rather than via querySelector with interpolation
					const allGalleryLinks = Array.from(
						document.querySelectorAll<HTMLLinkElement>(
							'link[rel="prefetch"][data-prefetched-by="gallery"]'
						)
					);

					// Compare with optimized Next.js URL (size adapted to viewport)
					const prefetchSize = getPrefetchImageSize();
					const optimizedUrl = nextImageUrl(imageUrl, prefetchSize, MAIN_IMAGE_QUALITY);
					const existingLink = allGalleryLinks.find((link) => link.href === optimizedUrl);
					if (existingLink) continue;

					// Create prefetch link with optimized Next.js URL
					const link = document.createElement("link");
					link.rel = "prefetch";
					link.as = "image";
					// Use optimized Next.js URL (640px mobile, 1080px desktop)
					link.href = optimizedUrl;
					link.dataset.prefetchedBy = "gallery";

					document.head.appendChild(link);
				}

				// Cleanup: remove old prefetch links that are no longer adjacent
				const allPrefetchLinks = Array.from(
					document.querySelectorAll<HTMLLinkElement>(
						'link[rel="prefetch"][data-prefetched-by="gallery"]'
					)
				);

				// Use optimized URLs for cleanup (same size as prefetch)
				const cleanupPrefetchSize = getPrefetchImageSize();
				const currentUrls = new Set(
					indicesToPrefetch
						.map((i) => imageUrls[i])
						.filter(Boolean)
						.map((url) => nextImageUrl(url, cleanupPrefetchSize, MAIN_IMAGE_QUALITY))
				);

				for (const link of allPrefetchLinks) {
					if (!currentUrls.has(link.href)) {
						link.remove();
					}
				}
			},
			{ timeout: 500 }
		);

		return () => {
			cancelIdleCallbackPolyfill(prefetchId);
			// Cleanup all prefetch links on unmount
			const allLinks = document.querySelectorAll<HTMLLinkElement>(
				'link[rel="prefetch"][data-prefetched-by="gallery"]'
			);
			allLinks.forEach((link) => link.remove());
		};
	}, [imageUrls, currentIndex, prefetchRange, enabled]);
}
