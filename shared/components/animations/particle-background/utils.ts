import type { CSSProperties } from "react";
import type { Easing, Transition } from "motion/react";
import { SHAPE_CONFIGS } from "./constants";
import type { Particle, ParticleShape } from "./types";
import { seededRandom } from "@/shared/utils/seeded-random";

export { seededRandom };

/** Cache pour la memoization des particules générées */
const particleCache = new Map<string, Particle[]>();
const MAX_CACHE_SIZE = 50;

const DEFAULT_DURATION = 20;

/** Génère un tableau de particules avec des propriétés déterministes (memoizé) */
export function generateParticles(
	count: number,
	size: [number, number],
	opacity: [number, number],
	colors: string[],
	blur: number | [number, number],
	depthParallax: boolean,
	shapes: ParticleShape[] = ["circle"],
	baseDuration: number = DEFAULT_DURATION
): Particle[] {
	const cacheKey = JSON.stringify([count, size, opacity, colors, blur, depthParallax, shapes, baseDuration]);
	const cached = particleCache.get(cacheKey);
	if (cached) return cached;

	const maxBlur = Array.isArray(blur) ? blur[1] : blur;

	const safeColors = colors.length > 0 ? colors : ["currentColor"];

	const particles = Array.from({ length: count }, (_, i) => {
		const seed = i * 1000;
		const rand = (offset: number) => seededRandom(seed + offset);

		const particleSize = size[0] + rand(1) * (size[1] - size[0]);
		const particleOpacity = opacity[0] + rand(2) * (opacity[1] - opacity[0]);
		const x = 5 + rand(3) * 90;
		const y = 5 + rand(4) * 90;
		const color = safeColors[Math.floor(rand(8) * safeColors.length)];

		// Blur correlated inversely to size: large particles are sharp (close), small ones are blurry (far)
		const sizeNorm = (particleSize - size[0]) / (size[1] - size[0] || 1);
		const particleBlur = Array.isArray(blur)
			? blur[0] + (1 - sizeNorm) * (blur[1] - blur[0])
			: blur;

		const depthFactor = maxBlur > 0 ? particleBlur / maxBlur : 0;
		const parallaxMultiplier = depthParallax ? 1 + depthFactor * 0.5 : 1;
		const particleDuration =
			baseDuration * 0.7 * parallaxMultiplier +
			rand(5) * baseDuration * 0.6 * parallaxMultiplier;
		const delay = rand(6) * baseDuration * 0.5;

		return {
			id: i,
			size: particleSize,
			opacity: particleOpacity,
			x,
			y,
			color,
			duration: particleDuration,
			delay,
			blur: particleBlur,
			depthFactor,
			shape: shapes[i % shapes.length],
		};
	});

	if (particleCache.size >= MAX_CACHE_SIZE) {
		const firstKey = particleCache.keys().next().value;
		if (firstKey) particleCache.delete(firstKey);
	}
	particleCache.set(cacheKey, particles);

	return particles;
}

/** Retourne les styles CSS pour une forme de particule */
export function getShapeStyles(
	shape: ParticleShape,
	size: number,
	color: string
): CSSProperties {
	const config = SHAPE_CONFIGS[shape];

	if (config.type === "css") {
		if (shape === "pearl") {
			return {
				...config.styles,
				background: `
					radial-gradient(ellipse 50% 40% at 30% 25%, rgba(255,255,255,0.7) 0%, transparent 60%),
					radial-gradient(circle at 50% 50%,
						color-mix(in oklch, ${color}, white 20%) 0%,
						${color} 40%,
						color-mix(in oklch, ${color}, black 10%) 100%)
				`,
			};
		}
		return { backgroundColor: color, ...config.styles };
	}

	if (config.type === "clipPath") {
		return { backgroundColor: color, clipPath: config.clipPath };
	}

	// SVG - rendu dans le composant
	return { backgroundColor: "transparent" };
}

/** Vérifie si une forme utilise le rendu SVG */
export function isSvgShape(shape: ParticleShape): boolean {
	return SHAPE_CONFIGS[shape].type === "svg";
}

/** Retourne la configuration SVG pour une forme */
export function getSvgConfig(shape: ParticleShape): { viewBox: string; path: string; fillRule?: "evenodd" | "nonzero" } | null {
	const config = SHAPE_CONFIGS[shape];
	if (config.type === "svg") {
		return { viewBox: config.viewBox, path: config.path, fillRule: config.fillRule };
	}
	return null;
}

/** Easings variés pour un mouvement plus organique */
const PARTICLE_EASINGS: Easing[] = [
	[0.4, 0, 0.2, 1], // easeInOut
	[0, 0, 0.2, 1], // easeOut
	[0.4, 0, 1, 1], // easeIn
	[0.33, 1, 0.68, 1], // easeOutCubic
];

/** Retourne la transition Framer Motion avec easing varié et repeatDelay */
export function getTransition(particle: Particle): Transition {
	return {
		duration: particle.duration,
		delay: particle.delay,
		ease: PARTICLE_EASINGS[particle.id % PARTICLE_EASINGS.length],
		repeat: Infinity,
		repeatType: "reverse" as const,
		repeatDelay: particle.delay * 0.2,
	};
}
