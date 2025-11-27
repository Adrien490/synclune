"use client";

import { cn } from "@/shared/utils/cn";
import { memo } from "react";
import { GlitterSparkles } from "./glitter-sparkles";
import { LiquidGradient } from "./liquid-gradient";

// ============================================================================
// TYPES
// ============================================================================

export interface HeroBackgroundGlitterProps {
	/** Classes Tailwind additionnelles pour le conteneur */
	className?: string;
	/**
	 * Intensité globale de l'effet (0.1 - 1)
	 * - 0.1-0.3: Subtil et professionnel
	 * - 0.4-0.7: Équilibré (défaut: 0.6)
	 * - 0.8-1: Très présent et vibrant
	 */
	intensity?: number;
	/**
	 * Préset de style
	 * - "subtle": Discret, élégant (intensité: 0.4)
	 * - "balanced": Équilibré (intensité: 0.6, défaut)
	 * - "vibrant": Présent, girly (intensité: 0.85)
	 */
	preset?: "subtle" | "balanced" | "vibrant";
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration des présets
 */
const PRESET_CONFIG = {
	subtle: {
		liquidIntensity: 0.1,
		glitterCount: 30,
		glitterGlow: 0.6,
		description: "Discret et élégant",
	},
	balanced: {
		liquidIntensity: 0.15,
		glitterCount: 50,
		glitterGlow: 0.8,
		description: "Équilibré et professionnel",
	},
	vibrant: {
		liquidIntensity: 0.25,
		glitterCount: 70,
		glitterGlow: 1,
		description: "Présent et girly",
	},
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

const HeroBackgroundGlitterBase = ({
	className,
	intensity,
	preset = "balanced",
}: HeroBackgroundGlitterProps) => {
	// Récupérer la config du preset
	const config = PRESET_CONFIG[preset];

	// Si intensity est fourni manuellement, l'utiliser, sinon utiliser le preset
	const finalIntensity = intensity ?? 0.6;

	// Calculer les valeurs en fonction de l'intensité
	const liquidIntensity = intensity
		? config.liquidIntensity * (finalIntensity / 0.6)
		: config.liquidIntensity;

	const glitterCount = intensity
		? Math.round(config.glitterCount * (finalIntensity / 0.6))
		: config.glitterCount;

	const glitterGlow = intensity
		? Math.min(1, config.glitterGlow * (finalIntensity / 0.6))
		: config.glitterGlow;

	return (
		<div
			className={cn(
				"absolute inset-0 overflow-hidden pointer-events-none",
				className
			)}
			aria-hidden="true"
			data-testid="hero-background-glitter"
			data-preset={preset}
		>
			{/* Fond avec gradient pastel doux */}
			<div className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20" />

			{/* Couche 1: Liquid Gradient (base fluide) */}
			<LiquidGradient intensity={liquidIntensity} speed={1} />

			{/* Couche 2: Glitter Sparkles (overlay scintillant) */}
			<GlitterSparkles
				count={glitterCount}
				sizeRange={[2, 6]}
				glowIntensity={glitterGlow}
			/>
		</div>
	);
};

/**
 * Arrière-plan Hero avec effet Glitter + Liquid Gradient
 *
 * **Option A - Le meilleur des deux mondes**
 *
 * Combine deux effets complémentaires :
 * - **Base** : Gradient liquide fluide et organique (tendance 2025)
 * - **Overlay** : Paillettes scintillantes évoquant les bijoux
 *
 * **Style** : Girly mais professionnel, élégant et mémorable
 *
 * **Lisibilité** : ⭐⭐⭐⭐⭐ (opacités faibles, contenu toujours visible)
 *
 * **Performance** :
 * - Optimisé avec React.memo et useMemo
 * - Adaptatif : moins d'éléments sur mobile
 * - Respecte prefers-reduced-motion
 *
 * @example
 * ```tsx
 * // Utilisation basique (preset balanced)
 * <HeroBackgroundGlitter />
 *
 * // Preset subtil pour un look discret
 * <HeroBackgroundGlitter preset="subtle" />
 *
 * // Preset vibrant pour maximum d'effet
 * <HeroBackgroundGlitter preset="vibrant" />
 *
 * // Personnalisé avec intensité manuelle
 * <HeroBackgroundGlitter intensity={0.8} />
 * ```
 */
export const HeroBackgroundGlitter = memo(HeroBackgroundGlitterBase);
HeroBackgroundGlitter.displayName = "HeroBackgroundGlitter";
