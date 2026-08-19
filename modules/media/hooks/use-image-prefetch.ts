"use client";

import { useEffect } from "react";

import { mediaBelow } from "@/shared/constants/breakpoints";
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
 * Uses setTimeout as a low-priority fallback: le callback est planifié après
 * `timeout` ms (pas « dès que possible »), faute de vraie notion d'idle —
 * c'est le comportement basse priorité attendu d'un prefetch. L'ancien
 * `Math.min(1, timeout)` planifiait à 1 ms quel que soit `timeout`.
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
				}, timeout);
			};

const cancelIdleCallbackPolyfill =
	typeof window !== "undefined" && "cancelIdleCallback" in window
		? window.cancelIdleCallback
		: (id: number) => window.clearTimeout(id);

/**
 * Determines the optimal image size to prefetch based on viewport.
 * Mobile (<48rem): 640px - matches 375-430px viewports
 * Desktop (>=48rem): 1080px - matches desktop viewports
 *
 * `matchMedia` et non `window.innerWidth` : `innerWidth` inclut la barre de
 * défilement (Windows/Linux, ~15px), donc les deux méthodes divergeaient sur la
 * bande 768-783px — on préchargeait l'image desktop là où le CSS servait encore
 * la mise en page mobile. Et le seuil vient du SSOT, en rem, pour suivre les
 * variants Tailwind si la police racine change (audit responsive 2026-07-26).
 */
function getPrefetchImageSize(): number {
	if (typeof window === "undefined") return PREFETCH_SIZE_DESKTOP;
	if (typeof window.matchMedia !== "function") return PREFETCH_SIZE_DESKTOP;
	return window.matchMedia(mediaBelow("md")).matches ? PREFETCH_SIZE_MOBILE : PREFETCH_SIZE_DESKTOP;
}

/**
 * Hook for intelligent image prefetching in a carousel.
 *
 * Prefetch strategy (Next.js 16 + React 19 best practices):
 * 1. Prefetch adjacent images (next + previous)
 * 2. Uses requestIdleCallback to avoid blocking the main thread (with Safari polyfill)
 * 3. Creates <link rel="prefetch"> elements in the <head>
 * 4. Full teardown of the links on every index change (see effect cleanup)
 * 5. SSR protection (checks for window)
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
			indicesToPrefetch.push((currentIndex - i + imageUrls.length) % imageUrls.length);
		}

		// Use requestIdleCallback with polyfill for Safari
		const prefetchId = requestIdleCallbackPolyfill(
			() => {
				const prefetchSize = getPrefetchImageSize();

				// Set : deux indices adjacents peuvent pointer la même URL sur une
				// petite galerie (wrap circulaire) — on dédoublonne DANS ce run.
				// Aucune dédup contre le DOM en revanche : le cleanup de l'effet
				// détruit tous les links à chaque changement d'index, donc il n'y a
				// jamais de link survivant d'un run précédent à retrouver.
				const urlsToPrefetch = new Set<string>();
				for (const index of indicesToPrefetch) {
					const imageUrl = imageUrls[index];
					if (!imageUrl) continue;
					// Optimized Next.js URL (640px mobile, 1080px desktop)
					urlsToPrefetch.add(nextImageUrl(imageUrl, prefetchSize, MAIN_IMAGE_QUALITY));
				}

				for (const optimizedUrl of urlsToPrefetch) {
					const link = document.createElement("link");
					link.rel = "prefetch";
					link.as = "image";
					link.href = optimizedUrl;
					link.dataset.prefetchedBy = "gallery";

					document.head.appendChild(link);
				}
			},
			{ timeout: 500 },
		);

		return () => {
			cancelIdleCallbackPolyfill(prefetchId);
			// Cleanup intégral à CHAQUE changement d'index (pas seulement à
			// l'unmount) : comportement choisi — le churn de <link> est amorti par
			// le cache HTTP (l'image déjà téléchargée n'est pas re-téléchargée).
			// C'est pourquoi toute logique « retirer les links plus adjacents » ou
			// de dédup inter-runs serait du code mort : rien ne survit à ce cleanup.
			const allLinks = document.querySelectorAll<HTMLLinkElement>(
				'link[rel="prefetch"][data-prefetched-by="gallery"]',
			);
			allLinks.forEach((link) => link.remove());
		};
	}, [imageUrls, currentIndex, prefetchRange, enabled]);
}
