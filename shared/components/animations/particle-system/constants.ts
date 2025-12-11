import type { AnimationPreset, AnimationStyle, ParticleShape, ShapeConfig } from "./types";

/** Couleurs par défaut (primary + secondary + pastel OKLCH) */
export const DEFAULT_COLORS = [
	"var(--primary)",
	"var(--secondary)",
	"oklch(0.92 0.08 350)", // Blush pastel
];

/** Configuration des formes de particules */
export const SHAPE_CONFIGS: Record<ParticleShape, ShapeConfig> = {
	circle: {
		type: "css",
		styles: { borderRadius: "9999px" },
	},
	diamond: {
		type: "css",
		styles: { borderRadius: "4px", rotate: "45deg" },
	},
	"soft-square": {
		type: "css",
		styles: { borderRadius: "20%" },
	},
	star: {
		type: "clipPath",
		clipPath:
			"polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
	},
	hexagon: {
		type: "clipPath",
		clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
	},
	ring: {
		type: "ring",
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
	},
	// Nouvelles formes bijouterie
	pearl: {
		type: "css",
		styles: {
			borderRadius: "50%",
			// Le gradient sera appliqué dynamiquement dans getShapeStyles
		},
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
	"butterfly-wing": {
		type: "svg",
		viewBox: "0 0 100 100",
		path: "M50 10 C70 10 90 30 90 50 C90 70 70 90 50 90 C40 75 30 60 50 50 C30 40 40 25 50 10 Z",
	},
	"flower-petal": {
		type: "clipPath",
		clipPath:
			"ellipse(35% 50% at 50% 50%)",
	},
	leaf: {
		type: "clipPath",
		clipPath:
			"polygon(50% 0%, 85% 20%, 100% 50%, 85% 80%, 50% 100%, 15% 80%, 0% 50%, 15% 20%)",
	},
};

/** Presets d'animation par style (optimises pour GPU) */
export const ANIMATION_PRESETS: Record<AnimationStyle, AnimationPreset> = {
	float: (p, intensity, rotation) => ({
		scale: [1, 1.4 * intensity, 0.8, 1],
		// Opacity avec amplitude reduite pour minimiser les repaints
		opacity: [p.opacity, p.opacity * 1.2, p.opacity * 0.8, p.opacity],
		x: ["0%", `${8 * intensity}%`, `${-8 * intensity}%`, "0%"],
		y: ["0%", `${-6 * intensity}%`, `${6 * intensity}%`, "0%"],
		...(rotation && { rotate: [0, 180, 360] }),
	}),
	drift: (p, intensity, rotation) => ({
		x: ["0%", `${15 * intensity}%`, `${-5 * intensity}%`, "0%"],
		y: ["0%", `${-10 * intensity}%`, `${5 * intensity}%`, "0%"],
		// Opacity stable pour drift - effet de derive naturel
		opacity: [p.opacity, p.opacity * 0.9, p.opacity],
		...(rotation && { rotate: [0, 45, 0] }),
	}),
};
