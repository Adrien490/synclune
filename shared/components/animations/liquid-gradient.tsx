"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/utils/cn";

// ============================================================================
// TYPES
// ============================================================================

export interface LiquidGradientProps {
	/** Classes Tailwind additionnelles pour le conteneur */
	className?: string;
	/** Intensité des couleurs (0.05 - 0.3, défaut: 0.15) */
	intensity?: number;
	/** Vitesse des animations en secondes (défaut: 20) */
	speed?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration des blobs liquides
 */
const BLOB_CONFIG = [
	{
		id: "blob-rose",
		// Position initiale
		position: { top: "-12rem", left: "-12rem" },
		// Taille
		size: { width: "600px", height: "600px" },
		// Couleur (utilise la variable CSS primary)
		color: "oklch(from var(--primary) l c h / var(--blob-opacity))",
		// Animation
		animation: {
			x: [0, 100, 0],
			y: [0, 50, 0],
			scale: [1, 1.2, 1],
		},
		duration: 20,
		blur: 80,
		centered: false,
	},
	{
		id: "blob-dore",
		position: { bottom: "-8rem", right: "-8rem" },
		size: { width: "500px", height: "500px" },
		color: "oklch(from var(--secondary) l c h / var(--blob-opacity))",
		animation: {
			x: [0, -80, 0],
			y: [0, -60, 0],
			scale: [1, 1.3, 1],
		},
		duration: 18,
		blur: 80,
		centered: false,
	},
	{
		id: "blob-champagne",
		position: { top: "50%", left: "50%" },
		size: { width: "400px", height: "400px" },
		color: "oklch(0.95 0.05 60 / var(--blob-opacity))",
		animation: {
			scale: [1, 1.4, 1],
			rotate: [0, 180, 360],
		},
		duration: 25,
		blur: 60,
		centered: true, // Pour appliquer translate
	},
];

/**
 * Animation vide pour prefers-reduced-motion
 */
const REDUCED_MOTION_ANIMATION = {
	opacity: [0.8, 1, 0.8],
};

// ============================================================================
// COMPONENT
// ============================================================================

const LiquidGradientBase = ({
	className,
	intensity = 0.15,
	speed = 1,
}: LiquidGradientProps) => {
	const reducedMotion = useReducedMotion();

	// Clamp intensity entre 0.05 et 0.3 pour sécurité
	const safeIntensity = Math.max(0.05, Math.min(0.3, intensity));

	return (
		<div
			className={cn(
				"absolute inset-0 overflow-hidden pointer-events-none",
				className
			)}
			aria-hidden="true"
			data-testid="liquid-gradient"
			style={
				{
					"--blob-opacity": safeIntensity,
				} as React.CSSProperties
			}
		>
			{BLOB_CONFIG.map((blob) => {
				// Animation adaptée selon prefers-reduced-motion
				const animation = reducedMotion
					? REDUCED_MOTION_ANIMATION
					: blob.animation;

				// Classes pour le positionnement
				const positionClasses = blob.centered
					? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
					: "";

				return (
					<motion.div
						key={blob.id}
						className={cn("absolute will-change-transform", positionClasses)}
						style={{
							...(!blob.centered && blob.position),
							width: blob.size.width,
							height: blob.size.height,
							background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
							filter: `blur(${blob.blur}px)`,
						}}
						animate={animation}
						transition={{
							duration: blob.duration / speed,
							repeat: reducedMotion ? 0 : Infinity,
							ease: "easeInOut",
						}}
					/>
				);
			})}
		</div>
	);
};

/**
 * Arrière-plan avec gradient liquide animé
 *
 * Trois blobs de couleurs qui se déplacent lentement pour créer
 * un effet fluide et organique. Parfait pour un hero moderne et élégant.
 *
 * @example
 * ```tsx
 * <LiquidGradient />
 * <LiquidGradient intensity={0.2} speed={0.8} />
 * ```
 */
export const LiquidGradient = memo(LiquidGradientBase);
LiquidGradient.displayName = "LiquidGradient";
