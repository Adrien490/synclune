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

/** Cache pour la memoization des particules générées */
const particleCache = new Map<number, Particle[]>();
const MAX_CACHE_SIZE = 50;

/** Hash numerique simple pour cle de cache (plus performant que JSON.stringify) */
function hashParams(
	count: number,
	size: [number, number],
	opacity: [number, number],
	colors: string[],
	duration: number,
	blur: number | [number, number],
	depthParallax: boolean,
	shapes: ParticleShape[]
): number {
	let hash = count * 1000000;
	hash += size[0] * 10000 + size[1] * 100;
	hash += Math.floor(opacity[0] * 10) + Math.floor(opacity[1] * 10) * 10;
	hash += duration * 100;
	hash += (Array.isArray(blur) ? blur[0] + blur[1] * 100 : blur * 100);
	hash += depthParallax ? 1 : 0;
	hash += shapes.length * 10000;
	// Hash des strings (colors + shapes)
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

/** Génère un tableau de particules avec des propriétés déterministes (memoizé) */
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
	// Clé de cache basée sur un hash numerique (plus rapide que JSON.stringify)
	const cacheKey = hashParams(count, size, opacity, colors, duration, blur, depthParallax, shapes);
	const cached = particleCache.get(cacheKey);
	if (cached) return cached;

	const maxBlur = Array.isArray(blur) ? blur[1] : blur;

	const particles = Array.from({ length: count }, (_, i) => {
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

	// Stocker dans le cache avec limite de taille
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
	color: string,
	useGradient: boolean = false
): React.CSSProperties {
	const config = SHAPE_CONFIGS[shape];

	// Styles de base avec gradient optionnel
	const getBackground = (baseColor: string, applyGradient: boolean) => {
		if (!applyGradient) return { backgroundColor: baseColor };
		return {
			background: `radial-gradient(circle at 30% 30%,
				color-mix(in oklch, ${baseColor}, white 30%) 0%,
				${baseColor} 50%,
				color-mix(in oklch, ${baseColor}, black 15%) 100%)`,
		};
	};

	if (config.type === "css") {
		// Traitement spécial pour pearl avec reflet réaliste
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

		return {
			...getBackground(color, useGradient),
			...config.styles,
		};
	}

	if (config.type === "clipPath") {
		return {
			...getBackground(color, useGradient),
			clipPath: config.clipPath,
		};
	}

	if (config.type === "svg") {
		// Le SVG sera rendu dans le composant ParticleSet
		return {
			backgroundColor: "transparent",
		};
	}

	// Ring : bordure colorée avec centre transparent
	return {
		backgroundColor: "transparent",
		borderRadius: "9999px",
		border: `${Math.max(2, size * 0.15)}px solid ${color}`,
	};
}

/** Vérifie si une forme utilise le rendu SVG */
export function isSvgShape(shape: ParticleShape): boolean {
	const config = SHAPE_CONFIGS[shape];
	return config.type === "svg";
}

/** Retourne la configuration SVG pour une forme */
export function getSvgConfig(shape: ParticleShape) {
	const config = SHAPE_CONFIGS[shape];
	if (config.type === "svg") {
		return { viewBox: config.viewBox, path: config.path, fillRule: config.fillRule };
	}
	return null;
}

/** Génère le style de glow multi-couches optimisé */
export function getMultiLayerGlow(
	color: string,
	size: number,
	intensity: number
): React.CSSProperties {
	const glowSize = size * intensity;
	return {
		boxShadow: `
			0 0 ${glowSize * 0.5}px ${color},
			0 0 ${glowSize}px color-mix(in oklch, ${color}, transparent 50%),
			0 0 ${glowSize * 1.5}px color-mix(in oklch, ${color}, transparent 75%)
		`,
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
