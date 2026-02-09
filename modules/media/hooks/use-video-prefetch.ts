"use client";

import { useEffect, useRef } from "react";
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
 * 4. Automatically cleans up non-adjacent videos
 */
export function usePrefetchVideos({
	medias,
	currentIndex,
	prefetchRange = 1,
	enabled = true,
}: UsePrefetchVideosOptions) {
	const prefetchedVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!enabled || medias.length === 0) return;

		// Calculate indices to prefetch (with wrap for circular carousel)
		const indicesToPrefetch: number[] = [];
		for (let i = 1; i <= prefetchRange; i++) {
			indicesToPrefetch.push((currentIndex + i) % medias.length);
			indicesToPrefetch.push((currentIndex - i + medias.length) % medias.length);
		}

		// URLs of videos to prefetch
		const videoUrlsToPrefetch = new Set<string>();

		for (const index of indicesToPrefetch) {
			const media = medias[index];
			if (media?.mediaType === "VIDEO" && media.url) {
				videoUrlsToPrefetch.add(media.url);
			}
		}

		// Create video elements to preload metadata
		for (const url of videoUrlsToPrefetch) {
			if (prefetchedVideosRef.current.has(url)) continue;

			const video = document.createElement("video");
			video.preload = "metadata";
			video.src = url;
			video.muted = true;
			video.style.display = "none";
			video.setAttribute("aria-hidden", "true");

			// No need to add to DOM for preload
			prefetchedVideosRef.current.set(url, video);
		}

		// Cleanup: remove videos that are no longer adjacent
		for (const [url, video] of prefetchedVideosRef.current) {
			if (!videoUrlsToPrefetch.has(url)) {
				video.src = "";
				video.load();
				prefetchedVideosRef.current.delete(url);
			}
		}

		return () => {
			// Cleanup on unmount
			for (const [, video] of prefetchedVideosRef.current) {
				video.src = "";
				video.load();
			}
			prefetchedVideosRef.current.clear();
		};
	}, [medias, currentIndex, prefetchRange, enabled]);
}
