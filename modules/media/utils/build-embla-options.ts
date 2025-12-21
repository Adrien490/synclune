import type { EmblaOptionsType } from "embla-carousel";

/** Duree de l'animation de transition entre slides (en ms) */
const EMBLA_ANIMATION_DURATION_MS = 25;

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
		duration: prefersReducedMotion ? 0 : EMBLA_ANIMATION_DURATION_MS,
		watchDrag: true,
		dragThreshold: 15,
	};
}
