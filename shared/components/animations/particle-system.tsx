"use client";

import { cn } from "@/shared/utils/cn";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { memo, useMemo, useRef } from "react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Types stricts pour les classes Tailwind
 */
export type TailwindSize = `w-${number} h-${number}`;
export type TailwindBlur =
	| "blur-none"
	| "blur-sm"
	| "blur"
	| "blur-md"
	| "blur-lg"
	| "blur-xl"
	| "blur-2xl"
	| "blur-3xl";

/**
 * Types d'animations disponibles pour les particules
 * Simplifié à 2 types pour réduire la complexité JS (-60%)
 */
export type AnimationType = "float" | "sparkle";

/**
 * Couleurs disponibles pour les particules
 * Utilise les couleurs du système de design (primary=rose, secondary=doré)
 */
export type ParticleColor = "bg-primary" | "bg-secondary";

/**
 * Variants de particules disponibles :
 * - `hero` : 8 particules pour la hero section
 * - `section` : 4 particules pour les sections principales
 * - `minimal` : 2 particules pour les pages auth
 * - `jewelry` : Effet précieux avec scintillements (7 particules)
 */
export type ParticleVariant = "hero" | "section" | "minimal" | "jewelry";

/**
 * Configuration d'une particule individuelle
 */
export interface Particle {
	/** Position depuis le haut (%, px) */
	top?: string;
	/** Position depuis la gauche (%, px) */
	left?: string;
	/** Position depuis la droite (%, px) */
	right?: string;
	/** Position depuis le bas (%, px) */
	bottom?: string;
	/** Taille Tailwind strict */
	size: TailwindSize;
	/** Couleur de la particule */
	color: ParticleColor;
	/** Opacité (0-1) */
	opacity: number;
	/** Flou Tailwind strict */
	blur: TailwindBlur;
	/** Durée animation (secondes) */
	duration: number;
	/** Type d'animation (défaut: float) */
	animationType?: AnimationType;
}

/**
 * Props du système de particules décoratives
 */
export interface ParticleSystemProps {
	/** Type de particules (défaut: "section") */
	variant?: ParticleVariant;
	/** Classes Tailwind additionnelles pour le conteneur */
	className?: string;
	/** Re-trigger animations à chaque apparition (impact perf, défaut: false) */
	persistentAnimation?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Constantes d'animation
 */
const ANIMATION_CONFIG = {
	/** Délai entre le démarrage de chaque particule (secondes) */
	DELAY_MULTIPLIER: 0.5,
	/** Pause entre chaque loop d'animation (secondes) */
	REPEAT_DELAY: 5,
	/** Marge d'intersection pour trigger avant viewport (px) */
	INTERSECTION_MARGIN: "-100px",
} as const;

/**
 * Animations disponibles
 * Simplifié à 2 types essentiels : float (halos d'ambiance) et sparkle (scintillements)
 */
const ANIMATION_VARIANTS = {
	float: {
		x: [0, "10%", "-10%", "0"],
		y: [0, "-10%", "10%", "0"],
		scale: [1, 1.03, 0.97, 1],
	},
	sparkle: {
		scale: [1, 1.3, 1],
		opacity: [0.3, 0.9, 0.3],
		rotate: [0, 180, 360],
	},
} as const;

/**
 * Animation vide pour mode réduit ou hors viewport
 */
const EMPTY_ANIMATION = {} as const;

/**
 * Configuration des particules par variant (desktop)
 */
export const PARTICLE_CONFIG: Record<ParticleVariant, Particle[]> = {
	hero: [
		// Halos subtils aux coins
		{
			top: "8%",
			left: "3%",
			size: "w-40 h-40",
			color: "bg-primary",
			opacity: 0.1,
			blur: "blur-3xl",
			duration: 45,
			animationType: "float",
		},
		{
			bottom: "5%",
			right: "5%",
			size: "w-36 h-36",
			color: "bg-secondary",
			opacity: 0.1,
			blur: "blur-3xl",
			duration: 48,
			animationType: "float",
		},
		// Particules sur les bords
		{
			top: "18%",
			right: "8%",
			size: "w-24 h-24",
			color: "bg-secondary",
			opacity: 0.15,
			blur: "blur-2xl",
			duration: 38,
			animationType: "float",
		},
		{
			bottom: "15%",
			left: "8%",
			size: "w-20 h-20",
			color: "bg-primary",
			opacity: 0.14,
			blur: "blur-2xl",
			duration: 42,
			animationType: "float",
		},
		// Particules centrales
		{
			top: "28%",
			left: "48%",
			size: "w-16 h-16",
			color: "bg-primary",
			opacity: 0.18,
			blur: "blur-xl",
			duration: 35,
			animationType: "float",
		},
		{
			top: "55%",
			right: "6%",
			size: "w-14 h-14",
			color: "bg-secondary",
			opacity: 0.16,
			blur: "blur-xl",
			duration: 32,
			animationType: "float",
		},
		// Scintillements
		{
			top: "42%",
			left: "46%",
			size: "w-6 h-6",
			color: "bg-primary",
			opacity: 0.25,
			blur: "blur-lg",
			duration: 3.5,
			animationType: "sparkle",
		},
		{
			top: "65%",
			left: "47%",
			size: "w-4 h-4",
			color: "bg-secondary",
			opacity: 0.28,
			blur: "blur-lg",
			duration: 3,
			animationType: "sparkle",
		},
	],

	section: [
		{
			top: "8%",
			left: "10%",
			size: "w-24 h-24",
			color: "bg-primary",
			opacity: 0.25,
			blur: "blur-2xl",
			duration: 30,
			animationType: "float",
		},
		{
			top: "30%",
			right: "10%",
			size: "w-18 h-18",
			color: "bg-secondary",
			opacity: 0.55,
			blur: "blur-md",
			duration: 25,
			animationType: "float",
		},
		{
			bottom: "15%",
			left: "15%",
			size: "w-16 h-16",
			color: "bg-primary",
			opacity: 0.5,
			blur: "blur-lg",
			duration: 28,
			animationType: "float",
		},
		{
			bottom: "40%",
			right: "25%",
			size: "w-6 h-6",
			color: "bg-secondary",
			opacity: 0.7,
			blur: "blur-sm",
			duration: 2.2,
			animationType: "sparkle",
		},
	],

	minimal: [
		{
			top: "10%",
			right: "8%",
			size: "w-14 h-14",
			color: "bg-secondary",
			opacity: 0.4,
			blur: "blur-lg",
			duration: 32,
			animationType: "float",
		},
		{
			bottom: "12%",
			left: "8%",
			size: "w-12 h-12",
			color: "bg-primary",
			opacity: 0.35,
			blur: "blur-md",
			duration: 28,
			animationType: "float",
		},
	],

	jewelry: [
		// Halos d'ambiance
		{
			top: "15%",
			left: "10%",
			size: "w-36 h-36",
			color: "bg-secondary",
			opacity: 0.15,
			blur: "blur-3xl",
			duration: 35,
			animationType: "float",
		},
		{
			bottom: "20%",
			right: "15%",
			size: "w-32 h-32",
			color: "bg-primary",
			opacity: 0.18,
			blur: "blur-3xl",
			duration: 30,
			animationType: "float",
		},
		// Bijou principal (doré)
		{
			top: "30%",
			left: "25%",
			size: "w-20 h-20",
			color: "bg-secondary",
			opacity: 0.5,
			blur: "blur-lg",
			duration: 28,
			animationType: "float",
		},
		// Scintillements
		{
			top: "25%",
			right: "20%",
			size: "w-6 h-6",
			color: "bg-secondary",
			opacity: 0.7,
			blur: "blur-sm",
			duration: 2,
			animationType: "sparkle",
		},
		{
			bottom: "35%",
			left: "35%",
			size: "w-5 h-5",
			color: "bg-primary",
			opacity: 0.75,
			blur: "blur-sm",
			duration: 2.5,
			animationType: "sparkle",
		},
	],
};

/**
 * Configuration mobile allégée (-50% de particules)
 * Optimisé pour les performances sur petits écrans
 */
export const PARTICLE_CONFIG_MOBILE: Record<ParticleVariant, Particle[]> = {
	hero: [
		// 4 particules au lieu de 8
		{
			top: "8%",
			left: "3%",
			size: "w-32 h-32",
			color: "bg-primary",
			opacity: 0.1,
			blur: "blur-3xl",
			duration: 45,
			animationType: "float",
		},
		{
			bottom: "5%",
			right: "5%",
			size: "w-28 h-28",
			color: "bg-secondary",
			opacity: 0.1,
			blur: "blur-3xl",
			duration: 48,
			animationType: "float",
		},
		{
			top: "42%",
			left: "46%",
			size: "w-5 h-5",
			color: "bg-primary",
			opacity: 0.3,
			blur: "blur-lg",
			duration: 3.5,
			animationType: "sparkle",
		},
		{
			top: "65%",
			left: "47%",
			size: "w-4 h-4",
			color: "bg-secondary",
			opacity: 0.3,
			blur: "blur-lg",
			duration: 3,
			animationType: "sparkle",
		},
	],

	section: [
		// 2 particules au lieu de 4
		{
			top: "8%",
			left: "10%",
			size: "w-20 h-20",
			color: "bg-primary",
			opacity: 0.3,
			blur: "blur-2xl",
			duration: 30,
			animationType: "float",
		},
		{
			bottom: "15%",
			right: "10%",
			size: "w-5 h-5",
			color: "bg-secondary",
			opacity: 0.7,
			blur: "blur-sm",
			duration: 2.2,
			animationType: "sparkle",
		},
	],

	minimal: [
		// 1 particule au lieu de 2
		{
			top: "10%",
			right: "8%",
			size: "w-12 h-12",
			color: "bg-secondary",
			opacity: 0.4,
			blur: "blur-lg",
			duration: 32,
			animationType: "float",
		},
	],

	jewelry: [
		// 3 particules au lieu de 5
		{
			top: "15%",
			left: "10%",
			size: "w-28 h-28",
			color: "bg-secondary",
			opacity: 0.15,
			blur: "blur-3xl",
			duration: 35,
			animationType: "float",
		},
		{
			top: "30%",
			left: "25%",
			size: "w-16 h-16",
			color: "bg-secondary",
			opacity: 0.5,
			blur: "blur-lg",
			duration: 28,
			animationType: "float",
		},
		{
			top: "25%",
			right: "20%",
			size: "w-5 h-5",
			color: "bg-primary",
			opacity: 0.7,
			blur: "blur-sm",
			duration: 2,
			animationType: "sparkle",
		},
	],
};

// ============================================================================
// COMPONENT
// ============================================================================

const ParticleSystemBase = ({
	variant = "section",
	className,
	persistentAnimation = false,
}: ParticleSystemProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();
	const isMobile = useIsMobile();

	const isInView = useInView(containerRef, {
		once: !persistentAnimation,
		margin: `0px 0px ${ANIMATION_CONFIG.INTERSECTION_MARGIN} 0px`,
	});

	// Configuration adaptative selon le device
	const particles = isMobile
		? PARTICLE_CONFIG_MOBILE[variant]
		: PARTICLE_CONFIG[variant];

	// ===== Mémoïsation des transitions pour éviter recreations =====
	const transitions = useMemo(
		() =>
			particles.map((particle, index) => ({
				duration: particle.duration,
				delay: index * ANIMATION_CONFIG.DELAY_MULTIPLIER,
				ease: "easeInOut" as const,
				repeat: Infinity,
				repeatDelay: ANIMATION_CONFIG.REPEAT_DELAY,
			})),
		[particles]
	);

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			data-testid="particle-system"
			data-variant={variant}
			className={cn(
				"absolute inset-0 pointer-events-none overflow-hidden",
				className
			)}
		>
			{particles.map((particle, index) => {
				// Déterminer l'animation selon le type et l'état
				// WCAG: aucune animation si prefers-reduced-motion est activé
				const animationType = particle.animationType || "float";
				const animation =
					!isInView || reducedMotion
						? EMPTY_ANIMATION
						: ANIMATION_VARIANTS[animationType];

				return (
					<motion.span
						key={index}
						className={cn(
							"absolute rounded-full block will-change-transform",
							particle.size,
							particle.color,
							particle.blur
						)}
						style={{
							top: particle.top,
							left: particle.left,
							right: particle.right,
							bottom: particle.bottom,
							opacity: particle.opacity,
						}}
						animate={animation}
						transition={transitions[index]}
					/>
				);
			})}
		</div>
	);
};

/**
 * Système de particules décoratives
 *
 * @example
 * <ParticleSystem variant="hero" />
 * <ParticleSystem variant="section" />
 * <ParticleSystem variant="minimal" />
 * <ParticleSystem variant="jewelry" />
 */
export const ParticleSystem = memo(ParticleSystemBase);
ParticleSystem.displayName = "ParticleSystem";
