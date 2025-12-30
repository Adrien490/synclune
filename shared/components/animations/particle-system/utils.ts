import type { CSSProperties } from "react";
import type { Easing, Transition } from "motion/react";
import { MOTION_CONFIG } from "../motion.config";
import { SHAPE_CONFIGS } from "./constants";
import type { Particle, ParticleShape } from "./types";

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32)
 * Meilleure distribution que Math.sin() - pas de patterns visibles
 */
function mulberry32(seed: number): () => number {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Générateur pseudo-aléatoire déterministe (seeded) */
export function seededRandom(seed: number): number {
	return mulberry32(seed)();
}

/** Cache pour la memoization des particules générées */
const particleCache = new Map<number, Particle[]>();
const MAX_CACHE_SIZE = 50;

/** Hash numerique simple pour cle de cache */
function hashParams(
	count: number,
	size: [number, number],
	opacity: [number, number],
	colors: string[],
	blur: number | [number, number],
	depthParallax: boolean,
	shapes: ParticleShape[],
	baseDuration: number
): number {
	let hash = count * 1000000;
	hash += size[0] * 10000 + size[1] * 100;
	hash += Math.floor(opacity[0] * 10) + Math.floor(opacity[1] * 10) * 10;
	hash += (Array.isArray(blur) ? blur[0] + blur[1] * 100 : blur * 100);
	hash += depthParallax ? 1 : 0;
	hash += shapes.length * 10000;
	hash += baseDuration * 1000;
	for (const c of colors) {
		for (let i = 0; i < c.length; i++) {
			hash = (hash * 31 + c.charCodeAt(i)) | 0;
		}
	}
	for (const s of shapes) {
		for (let i = 0; i < s.length; i++) {
			hash = (hash * 31 + s.charCodeAt(i)) | 0;
		}
	}
	return hash;
}

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
	const cacheKey = hashParams(count, size, opacity, colors, blur, depthParallax, shapes, baseDuration);
	const cached = particleCache.get(cacheKey);
	if (cached) return cached;

	const maxBlur = Array.isArray(blur) ? blur[1] : blur;

	const particles = Array.from({ length: count }, (_, i) => {
		const seed = i * 1000;
		const rand = (offset: number) => {
			const x = Math.sin(seed + offset) * 10000;
			return x - Math.floor(x);
		};

		const particleSize = size[0] + rand(1) * (size[1] - size[0]);
		const particleOpacity = opacity[0] + rand(2) * (opacity[1] - opacity[0]);
		const x = 5 + rand(3) * 90;
		const y = 5 + rand(4) * 90;
		const color = colors[i % colors.length];
		const particleBlur = Array.isArray(blur)
			? blur[0] + rand(7) * (blur[1] - blur[0])
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
				borderRadius: "50%",
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
export function getSvgConfig(shape: ParticleShape) {
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
		repeatDelay: particle.delay * 0.2,
	};
}
