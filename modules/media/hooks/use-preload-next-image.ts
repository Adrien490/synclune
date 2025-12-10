import { useEffect } from "react";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/**
 * Preload l'image suivante pour améliorer la latence perçue
 * Ne preload que les images (pas les vidéos)
 */
export function usePreloadNextImage(
	medias: ProductMedia[],
	currentIndex: number
): void {
	useEffect(() => {
		if (medias.length <= 1) return;

		const nextIndex = (currentIndex + 1) % medias.length;
		const nextMedia = medias[nextIndex];

		if (nextMedia?.mediaType === "IMAGE" && nextMedia.url) {
			const img = new Image();
			img.src = nextMedia.url;
		}
	}, [currentIndex, medias]);
}
