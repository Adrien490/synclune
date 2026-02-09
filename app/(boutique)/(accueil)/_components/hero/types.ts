import type { MotionValue } from "motion/react";
import type { HeroProductImage } from "../../_utils/extract-hero-images";
import type { IMAGE_POSITIONS } from "./image-positions";

export interface HeroFloatingImagesProps {
	images: HeroProductImage[];
}

export interface FloatingImageProps {
	image: HeroProductImage;
	position: (typeof IMAGE_POSITIONS)[number];
	scrollProgress: MotionValue<number>;
	parallaxOpacity: MotionValue<number>;
	shouldReduceMotion: boolean | null;
	isInView: boolean;
	index: number;
}
