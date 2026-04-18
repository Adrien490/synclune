import HeroFloatingImagesInner from "./hero-floating-images-inner";
import type { HeroFloatingImagesProps } from "./types";

export function HeroFloatingImages({ images }: HeroFloatingImagesProps) {
	if (images.length === 0) return null;
	return <HeroFloatingImagesInner images={images} />;
}
