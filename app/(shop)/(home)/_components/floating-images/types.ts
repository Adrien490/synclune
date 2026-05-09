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
	/**
	 * MotionValue driving opacity from motion-react useTransform.
	 * `null` when native CSS scroll-driven animations are supported — the wrapper
	 * container animates opacity via `animation-timeline: scroll()` instead.
	 */
	parallaxOpacity: MotionValue<number> | null;
	pointerX: MotionValue<number>;
	pointerY: MotionValue<number>;
	shouldReduceMotion: boolean | null;
	isPriority: boolean;
}
