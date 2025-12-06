"use client";

import { cn } from "@/shared/utils/cn";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { memo, useMemo, useRef } from "react";
import { MOTION_CONFIG } from "./motion.config";

// ============================================================================
// TYPES
// ============================================================================

/** Presets de couleurs thématiques */
export type ColorPreset = "bijoux" | "rose" | "dore" | "pastel";

/** Formes des particules */
export type ParticleShape = "circle" | "diamond" | "soft-square";

export interface ParticleSystemProps {
	/** Nombre de particules (défaut: 6, mobile: divisé par 2) */
	count?: number;
	/** Taille min/max en pixels (défaut: [8, 64]) */
	size?: [number, number];
	/** Opacité min/max (défaut: [0.1, 0.4]) */
	opacity?: [number, number];
	/** Preset de couleurs thématiques */
	colorPreset?: ColorPreset;
	/** Couleurs CSS des particules (override colorPreset) */
	colors?: string[];
	/** Blur min/max en pixels pour effet de profondeur (défaut: [12, 32]) */
	blur?: number | [number, number];
	/** Durée de l'animation en secondes (défaut: 20) */
	duration?: number;
	/** Forme des particules (défaut: "circle") */
	shape?: ParticleShape;
	/** Classes additionnelles */
	className?: string;
}

/** Données d'une particule générée */
interface Particle {
	id: number;
	size: number;
	opacity: number;
	x: number;
	y: number;
	color: string;
	duration: number;
	delay: number;
	blur: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Presets de couleurs utilisant les variables CSS du thème */
const COLOR_PRESETS: Record<ColorPreset, string[]> = {
	bijoux: [
		"var(--color-primary)",
		"var(--color-secondary)",
		"var(--color-pastel-blush)",
	],
	rose: [
		"var(--color-primary)",
		"var(--color-pastel-blush)",
		"var(--color-pastel-lavender)",
	],
	dore: [
		"var(--color-secondary)",
		"var(--color-pastel-peach)",
		"var(--color-pastel-cream)",
	],
	pastel: [
		"var(--color-pastel-peach)",
		"var(--color-pastel-lavender)",
		"var(--color-pastel-mint)",
		"var(--color-pastel-blush)",
	],
};

/** Styles CSS par forme de particule */
const SHAPE_STYLES: Record<ParticleShape, React.CSSProperties> = {
	circle: { borderRadius: "9999px" },
	diamond: { borderRadius: "4px", rotate: "45deg" },
	"soft-square": { borderRadius: "20%" },
};

// ============================================================================
// UTILS
// ============================================================================

/** Générateur pseudo-aléatoire déterministe (seeded) */
function seededRandom(seed: number) {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

/** Génère une valeur entre min et max avec un seed */
function randomBetween(min: number, max: number, seed: number) {
	return min + seededRandom(seed) * (max - min);
}

/** Génère un tableau de particules avec des propriétés déterministes */
function generateParticles(
	count: number,
	size: [number, number],
	opacity: [number, number],
	colors: string[],
	duration: number,
	blur: number | [number, number]
): Particle[] {
	return Array.from({ length: count }, (_, i) => {
		const seed = i * 1000;
		const particleSize = randomBetween(size[0], size[1], seed + 1);
		const particleOpacity = randomBetween(opacity[0], opacity[1], seed + 2);
		const x = randomBetween(5, 95, seed + 3);
		const y = randomBetween(5, 95, seed + 4);
		const color = colors[i % colors.length];
		const particleDuration = randomBetween(duration * 0.7, duration * 1.3, seed + 5);
		const delay = randomBetween(0, duration * 0.5, seed + 6);
		const particleBlur = Array.isArray(blur)
			? randomBetween(blur[0], blur[1], seed + 7)
			: blur;

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
		};
	});
}

// ============================================================================
// PARTICLE SET COMPONENT
// ============================================================================

interface ParticleSetProps {
	particles: Particle[];
	shapeStyles: React.CSSProperties;
	isInView: boolean;
	reducedMotion: boolean | null;
}

/**
 * Composant interne pour rendre un ensemble de particules
 * Gère à la fois le rendu statique (reduced motion) et animé
 */
const ParticleSet = ({
	particles,
	shapeStyles,
	isInView,
	reducedMotion,
}: ParticleSetProps) => {
	if (!isInView) return null;

	if (reducedMotion) {
		return (
			<>
				{particles.map((p) => (
					<span
						key={p.id}
						className="absolute"
						style={{
							width: p.size,
							height: p.size,
							left: `${p.x}%`,
							top: `${p.y}%`,
							backgroundColor: p.color,
							opacity: p.opacity,
							filter: `blur(${p.blur}px)`,
							...shapeStyles,
						}}
					/>
				))}
			</>
		);
	}

	return (
		<>
			{particles.map((p) => (
				<motion.span
					key={p.id}
					className="absolute will-change-transform"
					style={{
						width: p.size,
						height: p.size,
						left: `${p.x}%`,
						top: `${p.y}%`,
						backgroundColor: p.color,
						filter: `blur(${p.blur}px)`,
						...shapeStyles,
					}}
					animate={{
						scale: [1, 1.4, 0.8, 1],
						opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.6, p.opacity],
						x: ["0%", "8%", "-8%", "0%"],
						y: ["0%", "-6%", "6%", "0%"],
					}}
					transition={{
						duration: p.duration,
						delay: p.delay,
						ease: MOTION_CONFIG.easing.easeInOut,
						repeat: Infinity,
					}}
				/>
			))}
		</>
	);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ParticleSystemBase = ({
	count = 6,
	size = [8, 64],
	opacity = [0.1, 0.4],
	colorPreset,
	colors,
	blur = [12, 32],
	duration = 20,
	shape = "circle",
	className,
}: ParticleSystemProps) => {
	// Résoudre les couleurs : colors override colorPreset
	const resolvedColors =
		colors ?? (colorPreset ? COLOR_PRESETS[colorPreset] : COLOR_PRESETS.bijoux);

	// Styles de forme
	const shapeStyles = SHAPE_STYLES[shape];
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();

	// Lazy rendering : n'anime que si visible
	const isInView = useInView(containerRef, { once: true, margin: "-100px" });

	// Génération des deux sets de particules (mémoïsés séparément)
	// CSS media queries gèrent l'affichage → pas de flash d'hydratation
	const desktopParticles = useMemo(
		() => generateParticles(count, size, opacity, resolvedColors, duration, blur),
		[count, size, opacity, resolvedColors, duration, blur]
	);

	const mobileParticles = useMemo(
		() => generateParticles(Math.ceil(count / 2), size, opacity, resolvedColors, duration, blur),
		[count, size, opacity, resolvedColors, duration, blur]
	);

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
		>
			{/* Desktop : visible uniquement sur md+ (768px+) */}
			<div className="hidden md:contents">
				<ParticleSet
					particles={desktopParticles}
					shapeStyles={shapeStyles}
					isInView={isInView}
					reducedMotion={reducedMotion}
				/>
			</div>
			{/* Mobile : visible uniquement sous md (< 768px) */}
			<div className="contents md:hidden">
				<ParticleSet
					particles={mobileParticles}
					shapeStyles={shapeStyles}
					isInView={isInView}
					reducedMotion={reducedMotion}
				/>
			</div>
		</div>
	);
};

/**
 * Système de particules décoratives avec effet de profondeur
 *
 * Utilise CSS media queries pour la détection mobile (pas de flash d'hydratation).
 * Desktop: count particules, Mobile: count/2 particules.
 *
 * @example
 * // Défaut (preset bijoux)
 * <ParticleSystem />
 *
 * // Thème bijoux avec profondeur variable
 * <ParticleSystem colorPreset="bijoux" blur={[10, 40]} />
 *
 * // Effet diamant luxe
 * <ParticleSystem colorPreset="dore" shape="diamond" count={8} />
 *
 * // Pastels doux
 * <ParticleSystem colorPreset="pastel" blur={[20, 45]} />
 *
 * // Override custom complet
 * <ParticleSystem colors={["#FFD700", "#FFC0CB"]} blur={[8, 50]} />
 */
export const ParticleSystem = memo(ParticleSystemBase);
ParticleSystem.displayName = "ParticleSystem";
