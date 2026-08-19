import type { Slide } from "yet-another-react-lightbox";
import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { getVideoMimeType } from "../utils/media-type-detection";
import { nextImageUrl, LIGHTBOX_QUALITY, DEVICE_SIZES } from "../constants/image-config.constants";

/** Sizes used for lightbox srcSet (largest device sizes for fullscreen viewing) */
const LIGHTBOX_SRCSET_SIZES = DEVICE_SIZES.filter((s) => s >= 640);

/**
 * Converts product media into lightbox slides.
 * - Images: optimized via /_next/image with srcSet for responsive loading
 * - Videos: video format with conditional autoplay based on prefers-reduced-motion
 */
export function buildLightboxSlides(
	medias: ProductMedia[],
	prefersReducedMotion: boolean | null,
): Slide[] {
	return medias.map((media) => {
		if (media.type === "VIDEO") {
			return {
				type: "video" as const,
				sources: [
					{
						src: media.url,
						type: getVideoMimeType(media.url),
					},
				],
				autoPlay: !prefersReducedMotion,
				muted: true,
				loop: !prefersReducedMotion,
				playsInline: true,
			};
		}

		const src = nextImageUrl(
			media.url,
			LIGHTBOX_SRCSET_SIZES[LIGHTBOX_SRCSET_SIZES.length - 1]!,
			LIGHTBOX_QUALITY,
		);

		// Schéma lean (lot 2) : ProductMedia ne porte plus de dimensions
		// intrinsèques — la lightbox rend la seule `src` pleine taille (le ratio
		// est déduit du fichier au chargement).
		return { src, alt: media.alt };
	});
}
