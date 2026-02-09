import type { AnimationPreset, AnimationStyle, ParticleShape, ShapeConfig } from "./types";

/** Couleurs par défaut (primary + secondary + pastel OKLCH) */
export const DEFAULT_COLORS = [
	"var(--primary)",
	"var(--secondary)",
	"oklch(0.92 0.08 350)", // Blush pastel (intentionally without alpha, particles apply their own opacity)
];

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
	crescent: {
		type: "svg",
		viewBox: "0 0 100 100",
		path: "M 50 5 C 20 5, 5 25, 5 50 C 5 75, 20 95, 50 95 C 35 80, 30 65, 30 50 C 30 35, 35 20, 50 5 Z",
		fillRule: "evenodd",
	},
	pearl: {
		type: "css",
		styles: { borderRadius: "50%" },
	},
	drop: {
		type: "clipPath",
		clipPath:
			"polygon(50% 0%, 75% 25%, 85% 55%, 75% 80%, 50% 100%, 25% 80%, 15% 55%, 25% 25%)",
	},
	"sparkle-4": {
		type: "clipPath",
		clipPath:
			"polygon(50% 0%, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0% 50%, 42% 42%)",
	},
};

/** Shapes where rotation has no visible effect */
const ROUND_SHAPES: Set<ParticleShape> = new Set(["circle", "pearl"]);

/** Subtle rotation keyframes for non-circular shapes */
const subtleRotate = (p: { shape: ParticleShape }) =>
	ROUND_SHAPES.has(p.shape) ? {} : { rotate: [0, 8, -6, 0] };

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
	rise: (p) => ({
		y: ["0%", "-25%", "-50%", "-25%", "0%"],
		x: ["0%", "5%", "-3%", "-5%", "0%"],
		opacity: [p.opacity, Math.min(p.opacity * 1.1, 1), p.opacity * 0.6, Math.min(p.opacity * 1.1, 1), p.opacity],
		...subtleRotate(p),
	}),
	orbit: (p) => ({
		x: ["0%", "20%", "0%", "-20%", "0%"],
		y: ["0%", "-12%", "0%", "12%", "0%"],
		opacity: [p.opacity, p.opacity * 0.85, p.opacity, p.opacity * 0.85, p.opacity],
		...subtleRotate(p),
	}),
	breathe: (p) => ({
		scale: [1, 1.3, 1, 0.85, 1],
		opacity: [p.opacity, Math.min(p.opacity * 1.3, 1), p.opacity, p.opacity * 0.7, p.opacity],
	}),
};
