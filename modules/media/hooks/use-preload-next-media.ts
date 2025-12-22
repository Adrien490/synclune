import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/**
 * Preload les medias suivant et precedent pour ameliorer la latence percue
 * - Images : preload via Image() natif (cache memoire)
 * - Videos : preload via React 19 API (priorite basse, deduplication auto)
 */
export function usePreloadNextMedia(
	medias: ProductMedia[],
	currentIndex: number
): void {
	// Cache images (evite garbage collection)
	const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

	useEffect(() => {
		if (medias.length <= 1) return;

		// Preload next ET prev pour navigation bidirectionnelle fluide
		const nextIndex = (currentIndex + 1) % medias.length;
		const prevIndex = currentIndex === 0 ? medias.length - 1 : currentIndex - 1;

		[nextIndex, prevIndex].forEach((index) => {
			const media = medias[index];
			if (!media?.url) return;

			if (media.mediaType === "IMAGE") {
				// Preload image via Image() natif (garde en memoire)
				if (!imageCacheRef.current.has(media.url)) {
					const img = new Image();
					img.onerror = () => imageCacheRef.current.delete(media.url);
					img.src = media.url;
					imageCacheRef.current.set(media.url, img);
				}
			} else if (media.mediaType === "VIDEO") {
				// React 19 preload API - priorite basse pour ne pas bloquer
				preload(media.url, { as: "video", fetchPriority: "low" });
			}
		});
	}, [currentIndex, medias]);

	// Cleanup images au unmount
	useEffect(() => {
		return () => imageCacheRef.current.clear();
	}, []);
}
