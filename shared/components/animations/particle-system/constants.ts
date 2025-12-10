import type { AnimationPreset, AnimationStyle, ParticleShape, ShapeConfig } from "./types";

/** Couleurs par défaut (primary + secondary + pastel OKLCH) */
export const DEFAULT_COLORS = [
	"var(--primary)",
	"var(--secondary)",
	"oklch(0.92 0.08 350)", // Blush pastel
];

/** Presets prédéfinis pour les cas d'usage courants */
export const PARTICLE_PRESETS = {
	/** Hero section - particules subtiles avec profondeur */
	hero: {
		count: 8,
		blur: [20, 50] as [number, number],
		opacity: [0.08, 0.25] as [number, number],
		size: [20, 80] as [number, number],
	},
	/** Arrière-plan minimal (auth, modals) */
	subtle: {
		count: 4,
		opacity: [0.05, 0.15] as [number, number],
		blur: [15, 40] as [number, number],
	},
	/** Ambiance bijoux (diamants dorés) */
	jewelry: {
		shape: "diamond" as const,
		colors: ["var(--secondary)", "oklch(0.9 0.1 80)", "oklch(0.92 0.08 60)"],
		opacity: [0.12, 0.35] as [number, number],
		blur: [15, 45] as [number, number],
	},
	/** Célébration (étoiles scintillantes) */
	celebration: {
		shape: "star" as const,
		animationStyle: "twinkle" as const,
		glow: true,
		colors: ["var(--secondary)", "oklch(0.95 0.05 80)"],
	},
	/** Romantique (coeurs flottants) */
	romantic: {
		shape: "heart" as const,
		animationStyle: "drift" as const,
		rotation: true,
		colors: ["var(--primary)", "oklch(0.92 0.08 350)"],
	},
	/** Cristaux (hexagones avec glow) */
	crystal: {
		shape: "hexagon" as const,
		glow: true,
		springPhysics: true,
	},
} as const;

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

/** Presets d'animation par style */
export const ANIMATION_PRESETS: Record<AnimationStyle, AnimationPreset> = {
	float: (p, intensity, rotation) => ({
		scale: [1, 1.4 * intensity, 0.8, 1],
		opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.6, p.opacity],
		x: ["0%", `${8 * intensity}%`, `${-8 * intensity}%`, "0%"],
		y: ["0%", `${-6 * intensity}%`, `${6 * intensity}%`, "0%"],
		...(rotation && { rotate: [0, 180, 360] }),
	}),
	twinkle: (p, intensity, rotation) => ({
		opacity: [p.opacity * 0.3, p.opacity * 1.4, p.opacity * 0.3],
		scale: [0.7, 1.2 * intensity, 0.7],
		...(rotation && { rotate: [0, 90, 180] }),
	}),
	drift: (p, intensity, rotation) => ({
		x: ["0%", `${15 * intensity}%`, `${-5 * intensity}%`, "0%"],
		y: ["0%", `${-10 * intensity}%`, `${5 * intensity}%`, "0%"],
		opacity: [p.opacity, p.opacity * 0.85, p.opacity],
		...(rotation && { rotate: [0, 45, 0] }),
	}),
	pulse: (p, intensity, rotation) => ({
		scale: [1, 1.35 * intensity, 1],
		opacity: [p.opacity, p.opacity * 1.5, p.opacity],
		...(rotation && { rotate: [0, 180, 360] }),
	}),
	// Nouveaux styles d'animation
	shimmer: (p, intensity, rotation) => ({
		opacity: [p.opacity * 0.4, p.opacity * 1.3, p.opacity * 0.4],
		scale: [0.95, 1.05 * intensity, 0.95],
		...(rotation && { rotate: [0, 15, 0] }),
	}),
	cascade: (p, intensity, rotation) => ({
		y: ["0%", `${25 * intensity}%`, `${50 * intensity}%`],
		x: [
			`${-5 * intensity}%`,
			`${5 * intensity}%`,
			`${-3 * intensity}%`,
		],
		opacity: [p.opacity, p.opacity * 0.8, p.opacity * 0.3],
		...(rotation && { rotate: [0, 30, 60] }),
	}),
	orbit: (p, intensity, rotation) => ({
		x: [
			`${-12 * intensity}%`,
			`${12 * intensity}%`,
			`${-12 * intensity}%`,
		],
		y: [
			`${-6 * intensity}%`,
			`${6 * intensity}%`,
			`${-6 * intensity}%`,
		],
		scale: [1, 1.1, 1],
		...(rotation && { rotate: [0, 360] }),
	}),
	sway: (p, intensity, rotation) => ({
		rotate: [-12 * intensity, 12 * intensity, -12 * intensity],
		y: ["0%", `${4 * intensity}%`, "0%"],
		opacity: [p.opacity, p.opacity * 0.9, p.opacity],
	}),
};
