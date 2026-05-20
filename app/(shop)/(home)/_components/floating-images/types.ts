import type { HeroProductImage } from "../../_utils/extract-hero-images";
import type { IMAGE_POSITIONS } from "./image-positions";

export interface HeroFloatingImagesProps {
	images: HeroProductImage[];
}

export interface FloatingImageProps {
	image: HeroProductImage;
	position: (typeof IMAGE_POSITIONS)[number];
}
