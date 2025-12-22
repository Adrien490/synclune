import { useEffect, useRef } from "react";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/**
 * Preload les images suivante et precedente pour ameliorer la latence percue
 * Note: Le preload video via React 19 preload() ne fonctionne pas car les
 * elements <video> utilisent des range requests incompatibles avec le cache preload
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

			// Seulement les images - le preload video ne fonctionne pas
			if (media.mediaType === "IMAGE") {
				if (!imageCacheRef.current.has(media.url)) {
					const img = new Image();
					img.onerror = () => imageCacheRef.current.delete(media.url);
					img.src = media.url;
					imageCacheRef.current.set(media.url, img);
				}
			}
		});
	}, [currentIndex, medias]);

	// Cleanup images au unmount
	useEffect(() => {
		return () => imageCacheRef.current.clear();
	}, []);
}
