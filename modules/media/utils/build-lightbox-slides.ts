import type { Slide } from "yet-another-react-lightbox";
import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { getVideoMimeType } from "./media-utils";

/**
 * Convertit les médias produit en slides pour la lightbox
 * - Images : format standard avec alt
 * - Vidéos : format vidéo avec autoplay conditionnel selon prefers-reduced-motion
 */
export function buildLightboxSlides(
	medias: ProductMedia[],
	prefersReducedMotion: boolean | null
): Slide[] {
	return medias.map((media) => {
		if (media.mediaType === "VIDEO") {
			return {
				type: "video" as const,
				sources: [
					{
						src: media.url,
						type: getVideoMimeType(media.url),
					},
				],
				poster: media.thumbnailUrl || undefined,
				autoPlay: !prefersReducedMotion,
				muted: true,
				loop: !prefersReducedMotion,
				playsInline: true,
			};
		}

		return {
			src: media.url,
			alt: media.alt,
		};
	});
}
