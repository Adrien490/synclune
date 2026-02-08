"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/shared/utils/cn";
import { useIsTouchDevice } from "@/shared/hooks";
import { seededRandom } from "./particle-background/utils";
import { MOTION_CONFIG } from "./motion.config";

// ============================================================================
// TYPES
// ============================================================================

export interface GlitterSparklesProps {
	/** Classes Tailwind additionnelles pour le conteneur */
	className?: string;
	/** Nombre de paillettes (défaut: 25 desktop, 12 mobile) */
	count?: number;
	/** Taille des paillettes en pixels (défaut: 2-6) */
	sizeRange?: [number, number];
	/** Intensité de l'effet glow (0-1, défaut: 0.8) */
	glowIntensity?: number;
	/** Désactiver complètement sur appareils tactiles (mobile/tablette) pour performance */
	disableOnMobile?: boolean;
}

// ============================================================================
// TYPES INTERNES
// ============================================================================

interface Sparkle {
	id: number;
	size: number;
	left: number;
	top: number;
	delay: number;
	duration: number;
	color: string;
	glowSize: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Palette de couleurs pour les paillettes
 * Les 2 premières utilisent les CSS variables du thème pour suivre son évolution
 * Les autres sont des variations harmonieuses fixes
 */
const SPARKLE_COLORS = [
	"var(--primary)", // rose - suit le thème
	"var(--secondary)", // doré - suit le thème
	"oklch(0.95 0.05 60)", // champagne clair
	"oklch(0.85 0.15 320)", // rose vif
	"oklch(0.9 0.1 70)", // or chaud
] as const;

/**
 * Configuration par défaut
 * Optimisé pour les performances : -50% particules desktop, -40% mobile
 * Durées synchronisées avec MOTION_CONFIG.background.sparkle
 */
const DEFAULT_CONFIG = {
	COUNT_DESKTOP: 25, // Réduit de 50 → 25 pour fluidité +30%
	COUNT_MOBILE: 12, // Réduit de 20 → 12 pour performance mobile
	SIZE_MIN: 2,
	SIZE_MAX: 6,
	DURATION_MIN: MOTION_CONFIG.background.sparkle.durationRange[0],
	DURATION_MAX: MOTION_CONFIG.background.sparkle.durationRange[1],
	DELAY_MAX: MOTION_CONFIG.background.sparkle.delayMax,
	GLOW_MULTIPLIER: 2,
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Génère un nombre entre min et max avec un seed déterministe
 * Évite les flashs d'hydratation SSR/CSR
 */
const randomBetween = (min: number, max: number, seed: number): number =>
	min + seededRandom(seed) * (max - min);

/**
 * Génère les données des paillettes de manière déterministe
 * Utilise seededRandom pour cohérence SSR/CSR
 */
const generateSparkles = (
	count: number,
	sizeRange: [number, number],
	glowIntensity: number
): Sparkle[] => {
	return Array.from({ length: count }, (_, i) => {
		const seed = i * 1000; // Base seed unique par particule
		const size = randomBetween(sizeRange[0], sizeRange[1], seed + 1);
		return {
			id: i,
			size,
			left: randomBetween(0, 100, seed + 2),
			top: randomBetween(0, 100, seed + 3),
			delay: randomBetween(0, DEFAULT_CONFIG.DELAY_MAX, seed + 4),
			duration: randomBetween(DEFAULT_CONFIG.DURATION_MIN, DEFAULT_CONFIG.DURATION_MAX, seed + 5),
			color: SPARKLE_COLORS[i % SPARKLE_COLORS.length], // Déterministe via index
			glowSize: size * DEFAULT_CONFIG.GLOW_MULTIPLIER * glowIntensity,
		};
	});
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Composant interne pour rendre un set de paillettes
 */
const SparkleSet = ({
	sparkles,
	isInView,
}: {
	sparkles: Sparkle[];
	isInView: boolean;
}) => {
	if (!isInView) return null;

	return (
		<>
			{sparkles.map((sparkle) => {
				const totalRadius = sparkle.size / 2 + sparkle.glowSize;
				const coreRadius = sparkle.size / 2;

				return (
					<div
						key={sparkle.id}
						className="absolute rounded-full animate-glitter-twinkle"
						style={{
							left: `${sparkle.left}%`,
							top: `${sparkle.top}%`,
							width: totalRadius * 2,
							height: totalRadius * 2,
							background: `radial-gradient(circle, ${sparkle.color} ${coreRadius}px, transparent ${totalRadius}px)`,
							"--sparkle-duration": `${sparkle.duration}s`,
							"--sparkle-delay": `${sparkle.delay}s`,
						} as React.CSSProperties}
					/>
				);
			})}
		</>
	);
};

const GlitterSparklesBase = ({
	className,
	count,
	sizeRange = [DEFAULT_CONFIG.SIZE_MIN, DEFAULT_CONFIG.SIZE_MAX],
	glowIntensity = 0.8,
	disableOnMobile = false,
}: GlitterSparklesProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const isTouchDevice = useIsTouchDevice();
	const isInView = useInView(containerRef, {
		once: false,
		margin: "-100px",
	});

	// Désactiver sur mobile/tactile pour améliorer les performances (INP/TBT)
	if (disableOnMobile && isTouchDevice) {
		return null;
	}

	// Génération des paillettes pour desktop et mobile
	// CSS gère l'affichage conditionnel, évitant le flash d'hydratation
	const desktopSparkles = generateSparkles(count ?? DEFAULT_CONFIG.COUNT_DESKTOP, sizeRange, glowIntensity);
	const mobileSparkles = generateSparkles(count ?? DEFAULT_CONFIG.COUNT_MOBILE, sizeRange, glowIntensity);

	return (
		<div
			ref={containerRef}
			className={cn(
				"absolute inset-0 overflow-hidden pointer-events-none",
				className
			)}
			style={{ contain: "layout paint" }}
			aria-hidden="true"
			data-testid="glitter-sparkles"
		>
			{/* Desktop : visible uniquement sur md+ (768px+) */}
			<div className="hidden md:contents">
				<SparkleSet sparkles={desktopSparkles} isInView={isInView} />
			</div>
			{/* Mobile : visible uniquement sous md (< 768px) */}
			<div className="contents md:hidden">
				<SparkleSet sparkles={mobileSparkles} isInView={isInView} />
			</div>
		</div>
	);
};

/**
 * Effet de paillettes scintillantes
 *
 * Crée des petites particules qui apparaissent et disparaissent
 * en scintillant, rappelant l'éclat des bijoux précieux.
 *
 * - Adaptatif via CSS media queries (évite le flash d'hydratation)
 * - 25 particules desktop, 12 sur mobile
 * - Respecte prefers-reduced-motion (via CSS)
 * - Couleurs liées au thème via CSS variables
 * - Option disableOnMobile pour performances sur appareils tactiles
 * - Animations CSS compositor-only (zéro repaint, auto-pause hors onglet)
 * - Démontage hors viewport via useInView (once: false)
 *
 * @example
 * ```tsx
 * <GlitterSparkles />
 * <GlitterSparkles count={30} sizeRange={[3, 8]} glowIntensity={1} />
 * <GlitterSparkles disableOnMobile /> // Améliore INP/TBT sur mobile
 * ```
 */
export { GlitterSparklesBase as GlitterSparkles };
