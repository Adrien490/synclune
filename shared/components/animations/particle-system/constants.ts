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
		type: "clipPath",
		clipPath:
			"polygon(40% 0%, 100% 0%, 100% 100%, 40% 100%, 20% 85%, 10% 50%, 20% 15%)",
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
};
