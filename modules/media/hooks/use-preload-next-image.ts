import { useEffect, useRef } from "react";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/**
 * Preload l'image suivante et precedente pour ameliorer la latence percue
 * - Persiste les refs dans une Map pour eviter le garbage collection
 * - Ne preload que les images (pas les videos)
 */
export function usePreloadNextImage(
	medias: ProductMedia[],
	currentIndex: number
): void {
	// Cache persistant pour eviter garbage collection des images preloadees
	const preloadCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

	useEffect(() => {
		if (medias.length <= 1) return;

		// Preload next ET prev pour navigation bidirectionnelle fluide
		const nextIndex = (currentIndex + 1) % medias.length;
		const prevIndex = currentIndex === 0 ? medias.length - 1 : currentIndex - 1;

		[nextIndex, prevIndex].forEach((index) => {
			const media = medias[index];
			if (media?.mediaType === "IMAGE" && media.url) {
				// Verifier si deja en cache
				if (!preloadCacheRef.current.has(media.url)) {
					const img = new Image();
					img.onload = () => {
						// Garder en cache apres chargement
					};
					img.onerror = () => {
						console.warn(`[PreloadNextImage] Erreur preload: ${media.url.substring(0, 100)}`);
						preloadCacheRef.current.delete(media.url);
					};
					img.src = media.url;
					preloadCacheRef.current.set(media.url, img);
				}
			}
		});
	}, [currentIndex, medias]);

	// Cleanup au unmount
	useEffect(() => {
		return () => {
			preloadCacheRef.current.clear();
		};
	}, []);
}
