import type { EmblaOptionsType } from "embla-carousel";

/**
 * Construit les options pour le carousel Embla
 */
export function buildEmblaOptions(
	imageCount: number,
	prefersReducedMotion: boolean | null
): EmblaOptionsType {
	return {
		loop: imageCount > 1,
		align: "center",
		duration: prefersReducedMotion ? 0 : 25,
		watchDrag: true,
		dragThreshold: 15,
	};
}
