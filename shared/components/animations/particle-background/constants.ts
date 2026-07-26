import type { AnimationPreset, AnimationStyle, ParticleShape, ShapeConfig } from "./types";

/** Couleurs par défaut (primary + secondary + pastel CSS variables) */
export const DEFAULT_COLORS = [
	"var(--primary)",
	"var(--secondary)",
	"var(--color-particle-blush)",
	"var(--color-particle-lavender)",
];

/** Upper bound for particle count to prevent excessive DOM nodes */
export const MAX_PARTICLES = 30;

/** Base animation duration in seconds (multiplied by depth + speed factors) */
export const DEFAULT_DURATION = 20;

/** Base animation duration on mobile in seconds (shorter loop = livelier on small screens) */
export const MOBILE_DURATION = 12;

/** Configuration des formes de particules */
export const SHAPE_CONFIGS: Record<ParticleShape, ShapeConfig> = {
	circle: {
		type: "css",
		styles: { borderRadius: "50%" },
	},
	diamond: {
		type: "css",
		styles: { borderRadius: "4px", rotate: "45deg" },
	},
	heart: {
		type: "clipPath",
		clipPath:
			"polygon(50% 15%, 61% 0%, 80% 0%, 100% 20%, 100% 45%, 50% 100%, 0% 45%, 0% 20%, 20% 0%, 39% 0%)",
	},
	pearl: {
		type: "css",
		styles: { borderRadius: "50%" },
	},
	drop: {
		type: "clipPath",
		clipPath: "polygon(50% 0%, 75% 25%, 85% 55%, 75% 80%, 50% 100%, 25% 80%, 15% 55%, 25% 25%)",
	},
};

/** Shapes where rotation has no visible effect */
const ROUND_SHAPES: Set<ParticleShape> = new Set(["circle", "pearl"]);

/** Base rotation offset from shape styles (e.g. diamond = 45deg) */
function getBaseRotation(shape: ParticleShape): number {
	const config = SHAPE_CONFIGS[shape];
	if (config.type === "css" && typeof config.styles.rotate === "string") {
		return parseFloat(config.styles.rotate) || 0;
	}
	return 0;
}

/** Subtle rotation keyframes for non-circular shapes, preserving base rotation */
const subtleRotate = (p: { shape: ParticleShape }) => {
	if (ROUND_SHAPES.has(p.shape)) return {};
	const base = getBaseRotation(p.shape);
	return { rotate: [base, base + 8, base - 6, base] };
};

/** Presets d'animation par style (optimises pour GPU) */
export const ANIMATION_PRESETS: Record<AnimationStyle, AnimationPreset> = {
	float: (p) => ({
		scale: [1, 1.4, 0.8, 1],
		opacity: [p.opacity, Math.min(p.opacity * 1.2, 1), p.opacity * 0.8, p.opacity],
		x: ["0%", "8%", "-8%", "0%"],
		y: ["0%", "-6%", "6%", "0%"],
		...subtleRotate(p),
	}),
	drift: (p) => ({
		x: ["0%", "15%", "-5%", "0%"],
		y: ["0%", "-10%", "5%", "0%"],
		opacity: [p.opacity, p.opacity * 0.9, p.opacity],
		...subtleRotate(p),
	}),
	breathe: (p) => ({
		scale: [1, 1.3, 1, 0.85, 1],
		opacity: [p.opacity, Math.min(p.opacity * 1.3, 1), p.opacity, p.opacity * 0.7, p.opacity],
	}),
};
