"use client";

import { useEffect } from "react";
import type { ProductMedia } from "../types/product-media.types";

interface UsePrefetchVideosOptions {
	/** Gallery medias */
	medias: ProductMedia[];
	/** Current index in the carousel */
	currentIndex: number;
	/** Number of slides to prefetch before and after the current index */
	prefetchRange?: number;
	/** Enable prefetching */
	enabled?: boolean;
}

/**
 * Hook for intelligent prefetching of video metadata in a carousel
 *
 * Prefetch strategy:
 * 1. Identifies adjacent videos (N-1, N+1)
 * 2. Creates hidden <video preload="metadata"> elements
 * 3. Preloads only metadata (not the full video)
 * 4. Full teardown of the created elements on every index change (see effect cleanup)
 */
export function usePrefetchVideos({
	medias,
	currentIndex,
	prefetchRange = 1,
	enabled = true,
}: UsePrefetchVideosOptions) {
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!enabled || medias.length === 0) return;

		// Calculate indices to prefetch (with wrap for circular carousel)
		const indicesToPrefetch: number[] = [];
		for (let i = 1; i <= prefetchRange; i++) {
			indicesToPrefetch.push((currentIndex + i) % medias.length);
			indicesToPrefetch.push((currentIndex - i + medias.length) % medias.length);
		}

		// URLs of videos to prefetch — Set : deux indices adjacents peuvent
		// pointer la même URL sur une petite galerie (wrap circulaire), on
		// dédoublonne DANS ce run uniquement.
		const videoUrlsToPrefetch = new Set<string>();

		for (const index of indicesToPrefetch) {
			const media = medias[index];
			if (media?.type === "VIDEO" && media.url) {
				videoUrlsToPrefetch.add(media.url);
			}
		}

		// Create video elements to preload metadata
		const prefetchedVideos: HTMLVideoElement[] = [];
		for (const url of videoUrlsToPrefetch) {
			const video = document.createElement("video");
			video.preload = "metadata";
			video.src = url;
			video.muted = true;
			video.style.display = "none";
			video.setAttribute("aria-hidden", "true");

			// No need to add to DOM for preload
			prefetchedVideos.push(video);
		}

		return () => {
			// Cleanup intégral à CHAQUE changement d'index (pas seulement à
			// l'unmount) : comportement choisi — le churn d'éléments <video> est
			// amorti par le cache HTTP (les métadonnées déjà téléchargées ne le
			// sont pas deux fois). C'est pourquoi toute dédup inter-runs (ref/Map
			// persistante) ou logique « retirer les vidéos plus adjacentes »
			// serait du code mort : rien ne survit à ce cleanup.
			for (const video of prefetchedVideos) {
				video.src = "";
				video.load();
			}
		};
	}, [medias, currentIndex, prefetchRange, enabled]);
}
