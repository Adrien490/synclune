import type { AuroraIntensity, AuroraPalette } from "./types";

/** Named aurora palettes in oklch */
export const AURORA_PALETTES: Record<AuroraPalette, string[]> = {
	jewelry: [
		"oklch(0.82 0.12 340)", // rose quartz pink
		"oklch(0.72 0.14 280)", // amethyst lavender
		"oklch(0.88 0.08 85)", // gold shimmer
		"oklch(0.78 0.1 190)", // aquamarine
		"oklch(0.9 0.06 350)", // pearl blush
	],
	"rose-gold": [
		"oklch(0.8 0.1 20)", // warm rose
		"oklch(0.82 0.08 55)", // copper glow
		"oklch(0.9 0.05 80)", // pale gold
		"oklch(0.7 0.12 10)", // deep rose
	],
	moonstone: [
		"oklch(0.85 0.08 230)", // ice blue
		"oklch(0.78 0.1 285)", // soft violet
		"oklch(0.9 0.04 250)", // silver mist
		"oklch(0.65 0.12 250)", // deep blue
	],
	amethyst: [
		"oklch(0.6 0.18 290)", // deep violet
		"oklch(0.78 0.12 280)", // lavender
		"oklch(0.68 0.16 330)", // magenta
		"oklch(0.82 0.08 275)", // pale blue-violet
	],
};

/** Default colors when no palette or colors are provided */
export const DEFAULT_AURORA_COLORS = AURORA_PALETTES.jewelry;

/** Intensity presets controlling animation amplitude */
export const INTENSITY_CONFIGS: Record<
	AuroraIntensity,
	{
		translateRange: number;
		scaleRange: [number, number];
		rotateRange: number;
		opacityMultiplier: number;
	}
> = {
	subtle: {
		translateRange: 8,
		scaleRange: [0.95, 1.05],
		rotateRange: 3,
		opacityMultiplier: 0.7,
	},
	medium: {
		translateRange: 15,
		scaleRange: [0.9, 1.15],
		rotateRange: 6,
		opacityMultiplier: 1,
	},
	vivid: {
		translateRange: 25,
		scaleRange: [0.85, 1.25],
		rotateRange: 10,
		opacityMultiplier: 1.3,
	},
};

/** Maximum number of ribbons */
export const MAX_RIBBONS = 12;

/** Default animation duration in seconds */
export const DEFAULT_DURATION = 25;

/** Easings for organic ribbon motion */
export const RIBBON_EASINGS = [
	[0.4, 0, 0.2, 1], // easeInOut
	[0, 0, 0.2, 1], // easeOut
	[0.33, 1, 0.68, 1], // easeOutCubic
	[0.45, 0.05, 0.55, 0.95], // easeInOutSine
] as const;
