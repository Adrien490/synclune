import { useEffect, useRef } from "react";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/**
 * Preload les medias suivant et precedent pour ameliorer la latence percue
 * - Images : preload via Image() natif (cache memoire)
 * - Videos : prefetch via <link rel="prefetch"> (priorite basse, cache navigateur)
 */
export function usePreloadNextMedia(
	medias: ProductMedia[],
	currentIndex: number
): void {
	// Cache images (evite garbage collection)
	const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
	// Cache liens prefetch video
	const videoPrefetchRef = useRef<Map<string, HTMLLinkElement>>(new Map());

	useEffect(() => {
		if (medias.length <= 1) return;

		// Preload next ET prev pour navigation bidirectionnelle fluide
		const nextIndex = (currentIndex + 1) % medias.length;
		const prevIndex = currentIndex === 0 ? medias.length - 1 : currentIndex - 1;

		[nextIndex, prevIndex].forEach((index) => {
			const media = medias[index];
			if (!media?.url) return;

			if (media.mediaType === "IMAGE") {
				// Preload image via Image() natif
				if (!imageCacheRef.current.has(media.url)) {
					const img = new Image();
					img.onerror = () => {
						console.warn(`[PreloadNextMedia] Erreur preload image: ${media.url.substring(0, 100)}`);
						imageCacheRef.current.delete(media.url);
					};
					img.src = media.url;
					imageCacheRef.current.set(media.url, img);
				}
			} else if (media.mediaType === "VIDEO") {
				// Prefetch video via <link rel="prefetch">
				if (!videoPrefetchRef.current.has(media.url)) {
					const link = document.createElement("link");
					link.rel = "prefetch";
					link.as = "video";
					link.href = media.url;
					document.head.appendChild(link);
					videoPrefetchRef.current.set(media.url, link);
				}
			}
		});
	}, [currentIndex, medias]);

	// Cleanup au unmount
	useEffect(() => {
		return () => {
			imageCacheRef.current.clear();
			// Retirer les liens prefetch du DOM
			videoPrefetchRef.current.forEach((link) => link.remove());
			videoPrefetchRef.current.clear();
		};
	}, []);
}
