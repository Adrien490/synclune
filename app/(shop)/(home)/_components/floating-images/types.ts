import type { HeroProductImage } from "../../_utils/extract-hero-images";
import type { IMAGE_POSITIONS } from "./image-positions";

export interface HeroFloatingImagesProps {
	images: HeroProductImage[];
}

export interface FloatingImageProps {
	image: HeroProductImage;
	position: (typeof IMAGE_POSITIONS)[number];
	/**
	 * When true, emits `<link rel="preload">` SSR + eager fetchpriority=high.
	 * Reserved for the first floating image on desktop — LCP candidate above
	 * the fold. (Next 16: `preload` Boolean, the legacy `priority` prop no
	 * longer exists.)
	 */
	preload?: boolean;
}
