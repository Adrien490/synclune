"use client";

import { cn } from "@/shared/utils/cn";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { seededRandom } from "@/shared/utils/seeded-random";

// ============================================================================
// TYPES
// ============================================================================

export interface BubbleDreamProps {
	/** Classes Tailwind additionnelles pour le conteneur */
	className?: string;
	/** Nombre de bulles (défaut: 25 desktop, 15 mobile) */
	count?: number;
	/** Vitesse de montée des bulles (0.5 - 2, défaut: 1) */
	speed?: number;
	/**
	 * Intensité des couleurs (0.1 - 0.3, défaut: 0.15)
	 * Plus bas = plus subtil, plus haut = plus visible
	 */
	intensity?: number;
}

// ============================================================================
// TYPES INTERNES
// ============================================================================

interface Bubble {
	id: number;
	size: number;
	left: number;
	delay: number;
	duration: number;
	opacity: number;
	waveAmplitude: number;
	color: BubbleColor;
}

interface BubbleColor {
	outer: string;
	inner: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG = {
	COUNT_DESKTOP: 25,
	COUNT_MOBILE: 15,
	SIZE_MIN: 40,
	SIZE_MAX: 120,
	DURATION_MIN: 10,
	DURATION_MAX: 18,
	DELAY_MAX: 5,
	OPACITY_MIN: 0.05,
	OPACITY_MAX: 0.2,
	WAVE_MIN: 30,
	WAVE_MAX: 80,
} as const;

/**
 * Palette de couleurs pour les bulles
 * Chaque bulle a une couleur extérieure et intérieure pour l'effet de gradient
 */
const BUBBLE_COLORS: BubbleColor[] = [
	{
		// Rose doux
		outer: "oklch(0.95 0.08 340 / var(--bubble-opacity))",
		inner: "oklch(0.98 0.04 340 / calc(var(--bubble-opacity) * 1.5))",
	},
	{
		// Doré pâle
		outer: "oklch(0.92 0.07 80 / var(--bubble-opacity))",
		inner: "oklch(0.96 0.03 80 / calc(var(--bubble-opacity) * 1.5))",
	},
	{
		// Champagne
		outer: "oklch(0.94 0.05 60 / var(--bubble-opacity))",
		inner: "oklch(0.97 0.02 60 / calc(var(--bubble-opacity) * 1.5))",
	},
	{
		// Pêche
		outer: "oklch(0.93 0.09 40 / var(--bubble-opacity))",
		inner: "oklch(0.96 0.04 40 / calc(var(--bubble-opacity) * 1.5))",
	},
] as const;

/**
 * Animation réduite pour prefers-reduced-motion
 */
const REDUCED_MOTION_ANIMATION = {
	opacity: [0.3, 0.6, 0.3],
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Génère un nombre entre min et max avec un seed déterministe
 * Évite les différences d'hydratation SSR/CSR
 */
const randomBetween = (min: number, max: number, seed: number): number =>
	min + seededRandom(seed) * (max - min);

/**
 * Génère les données des bulles de manière déterministe
 * Utilise seededRandom pour cohérence SSR/CSR
 */
const generateBubbles = (count: number): Bubble[] => {
	return Array.from({ length: count }, (_, i) => {
		const seed = i * 1000;
		return {
			id: i,
			size: randomBetween(DEFAULT_CONFIG.SIZE_MIN, DEFAULT_CONFIG.SIZE_MAX, seed + 1),
			left: randomBetween(0, 100, seed + 2),
			delay: randomBetween(0, DEFAULT_CONFIG.DELAY_MAX, seed + 3),
			duration: randomBetween(DEFAULT_CONFIG.DURATION_MIN, DEFAULT_CONFIG.DURATION_MAX, seed + 4),
			opacity: randomBetween(DEFAULT_CONFIG.OPACITY_MIN, DEFAULT_CONFIG.OPACITY_MAX, seed + 5),
			waveAmplitude: randomBetween(DEFAULT_CONFIG.WAVE_MIN, DEFAULT_CONFIG.WAVE_MAX, seed + 6),
			color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
		};
	});
};

// ============================================================================
// BUBBLE SET COMPONENT
// ============================================================================

interface BubbleSetProps {
	bubbles: Bubble[];
	speed: number;
	isInView: boolean;
	reducedMotion: boolean | null;
}

/**
 * Composant interne pour rendre un ensemble de bulles
 * Gère à la fois le rendu statique (reduced motion) et animé
 */
const BubbleSet = ({ bubbles, speed, isInView, reducedMotion }: BubbleSetProps) => {
	if (!isInView) return null;

	return (
		<>
			{bubbles.map((bubble) => {
				// Animation selon prefers-reduced-motion
				// Utilise 100vh comme approximation SSR-safe de la hauteur
				const animation = reducedMotion
					? REDUCED_MOTION_ANIMATION
					: {
							y: [0, `calc(-100vh - ${bubble.size}px)`],
							x: [0, Math.sin(bubble.id) * bubble.waveAmplitude, 0],
							opacity: [0, bubble.opacity, bubble.opacity, 0],
						};

				return (
					<motion.div
						key={bubble.id}
						className="absolute rounded-full will-change-transform"
						style={{
							left: `${bubble.left}%`,
							bottom: "-10%",
							width: bubble.size,
							height: bubble.size,
							background: `radial-gradient(circle at 30% 30%, ${bubble.color.inner}, ${bubble.color.outer})`,
							border: "1px solid oklch(0.9 0.05 340 / 0.2)",
							boxShadow: "inset -10px -10px 20px oklch(1 0 0 / 0.3)",
							backdropFilter: "blur(2px)",
						}}
						initial={{ y: 0, opacity: 0 }}
						animate={animation}
						transition={{
							duration: bubble.duration / speed,
							delay: bubble.delay,
							repeat: reducedMotion ? 0 : Infinity,
							ease: reducedMotion ? "easeInOut" : "linear",
						}}
					/>
				);
			})}
		</>
	);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BubbleDreamBase = ({
	className,
	count,
	speed = 1,
	intensity = 0.15,
}: BubbleDreamProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();
	const isInView = useInView(containerRef, {
		once: true,
		margin: "-100px",
	});

	// Clamp intensity entre 0.1 et 0.3
	const safeIntensity = Math.max(0.1, Math.min(0.3, intensity));

	// Génération des bulles pour desktop et mobile
	// CSS media queries gèrent l'affichage → pas de flash d'hydratation
	const desktopBubbles = generateBubbles(count ?? DEFAULT_CONFIG.COUNT_DESKTOP);
	const mobileBubbles = generateBubbles(count ?? DEFAULT_CONFIG.COUNT_MOBILE);

	return (
		<div
			ref={containerRef}
			className={cn(
				"absolute inset-0 overflow-hidden pointer-events-none",
				className
			)}
			aria-hidden="true"
			data-testid="bubble-dream"
			style={
				{
					"--bubble-opacity": safeIntensity,
				} as React.CSSProperties
			}
		>
			{/* Gradient de fond pastel doux */}
			<div className="absolute inset-0 bg-linear-to-br from-pink-50/30 via-transparent to-amber-50/30" />

			{/* Desktop : visible uniquement sur md+ (768px+) */}
			<div className="hidden md:contents">
				<BubbleSet
					bubbles={desktopBubbles}
					speed={speed}
					isInView={isInView}
					reducedMotion={reducedMotion}
				/>
			</div>

			{/* Mobile : visible uniquement sous md (< 768px) */}
			<div className="contents md:hidden">
				<BubbleSet
					bubbles={mobileBubbles}
					speed={speed}
					isInView={isInView}
					reducedMotion={reducedMotion}
				/>
			</div>
		</div>
	);
};

/**
 * Arrière-plan Hero avec effet Bubble Dream
 *
 * **Option B - Coup de cœur 2025**
 *
 * Des bulles colorées qui montent doucement comme du champagne,
 * créant un effet délicat, kawaii et précieux.
 *
 * **Style** : Très 2025, girly sans être enfantin, parfait pour bijoux
 *
 * **Lisibilité** : ⭐⭐⭐⭐⭐ (bulles transparentes, fond toujours visible)
 *
 * **Performance** :
 * - Génération déterministe (seededRandom) pour cohérence SSR/CSR
 * - Adaptatif : moins de bulles sur mobile
 * - Respecte prefers-reduced-motion
 * - Utilise will-change pour GPU acceleration
 *
 * @example
 * ```tsx
 * // Utilisation basique
 * <BubbleDream />
 *
 * // Personnalisé avec plus de bulles et vitesse lente
 * <BubbleDream count={40} speed={0.7} />
 *
 * // Intensité augmentée pour plus de présence
 * <BubbleDream intensity={0.25} />
 * ```
 */
export { BubbleDreamBase as BubbleDream };
