import type { Slide } from "yet-another-react-lightbox";
import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { getVideoMimeType } from "../utils/media-utils";
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
		if (media.mediaType === "VIDEO") {
			return {
				type: "video" as const,
				sources: [
					{
						src: media.url,
						type: getVideoMimeType(media.url),
					},
				],
				poster: media.thumbnailUrl ?? undefined,
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

		// `ImageSource.height` est REQUIS par la lightbox et sert à calculer le ratio
		// d'affichage. Sans dimensions connues (média antérieur au backfill), on omet
		// le `srcSet` entier plutôt que de déclarer `height: 0` : un ratio impossible
		// cassait le fit et le zoom. Le rendu retombe sur la seule `src` pleine taille.
		if (!media.width || !media.height) {
			return { src, alt: media.alt };
		}

		const aspectRatio = media.height / media.width;

		return {
			src,
			alt: media.alt,
			width: media.width,
			height: media.height,
			srcSet: LIGHTBOX_SRCSET_SIZES.map((size) => ({
				src: nextImageUrl(media.url, size, LIGHTBOX_QUALITY),
				width: size,
				height: Math.round(size * aspectRatio),
			})),
		};
	});
}
