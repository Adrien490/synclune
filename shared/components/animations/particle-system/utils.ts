import type { Transition } from "framer-motion";
import { MOTION_CONFIG } from "../motion.config";
import { SHAPE_CONFIGS } from "./constants";
import type { Particle, ParticleShape } from "./types";

/** Normalise shape en tableau */
export function normalizeShapes(shape: ParticleShape | ParticleShape[]): ParticleShape[] {
	return Array.isArray(shape) ? shape : [shape];
}

/** Générateur pseudo-aléatoire déterministe (seeded) */
export function seededRandom(seed: number): number {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

/** Génère une valeur entre min et max avec un seed */
export function randomBetween(min: number, max: number, seed: number): number {
	return min + seededRandom(seed) * (max - min);
}

/** Génère un tableau de particules avec des propriétés déterministes */
export function generateParticles(
	count: number,
	size: [number, number],
	opacity: [number, number],
	colors: string[],
	duration: number,
	blur: number | [number, number],
	depthParallax: boolean,
	shapes: ParticleShape[] = ["circle"]
): Particle[] {
	const maxBlur = Array.isArray(blur) ? blur[1] : blur;

	return Array.from({ length: count }, (_, i) => {
		const seed = i * 1000;
		const particleSize = randomBetween(size[0], size[1], seed + 1);
		const particleOpacity = randomBetween(opacity[0], opacity[1], seed + 2);
		const x = randomBetween(5, 95, seed + 3);
		const y = randomBetween(5, 95, seed + 4);
		const color = colors[i % colors.length];
		const particleBlur = Array.isArray(blur)
			? randomBetween(blur[0], blur[1], seed + 7)
			: blur;

		// Facteur de profondeur : plus le blur est élevé, plus la particule est "loin"
		const depthFactor = maxBlur > 0 ? particleBlur / maxBlur : 0;

		// Parallax : les particules loin (blur élevé) bougent plus lentement
		const parallaxMultiplier = depthParallax ? 1 + depthFactor * 0.5 : 1;
		const particleDuration = randomBetween(
			duration * 0.7 * parallaxMultiplier,
			duration * 1.3 * parallaxMultiplier,
			seed + 5
		);
		const delay = randomBetween(0, duration * 0.5, seed + 6);

		// Forme : rotation déterministe parmi les formes disponibles
		const shape = shapes[i % shapes.length];

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
			shape,
		};
	});
}

/** Retourne les styles CSS pour une forme de particule */
export function getShapeStyles(
	shape: ParticleShape,
	size: number,
	color: string
): React.CSSProperties {
	const config = SHAPE_CONFIGS[shape];

	if (config.type === "css") {
		return {
			backgroundColor: color,
			...config.styles,
		};
	}

	if (config.type === "clipPath") {
		return {
			backgroundColor: color,
			clipPath: config.clipPath,
		};
	}

	// Ring : bordure colorée avec centre transparent
	return {
		backgroundColor: "transparent",
		borderRadius: "9999px",
		border: `${Math.max(2, size * 0.15)}px solid ${color}`,
	};
}

/** Retourne la transition Framer Motion */
export function getTransition(
	particle: Particle,
	springPhysics: boolean
): Transition {
	if (springPhysics) {
		return {
			duration: particle.duration,
			delay: particle.delay,
			repeat: Infinity,
			type: "spring",
			damping: 20,
			stiffness: 60,
		};
	}

	return {
		duration: particle.duration,
		delay: particle.delay,
		ease: MOTION_CONFIG.easing.easeInOut,
		repeat: Infinity,
	};
}
