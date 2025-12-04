"use client";

import { cn } from "@/shared/utils/cn";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { memo, useMemo, useRef, useSyncExternalStore } from "react";
import { MOTION_CONFIG } from "./motion.config";

// ============================================================================
// TYPES
// ============================================================================

export interface ParticleSystemProps {
	/** Nombre de particules (défaut: 6, mobile: divisé par 2) */
	count?: number;
	/** Taille min/max en pixels (défaut: [8, 64]) */
	size?: [number, number];
	/** Opacité min/max (défaut: [0.1, 0.4]) */
	opacity?: [number, number];
	/** Couleurs CSS des particules (défaut: primary + secondary) */
	colors?: string[];
	/** Intensité du blur en pixels (défaut: 20) */
	blur?: number;
	/** Durée de l'animation en secondes (défaut: 20) */
	duration?: number;
	/** Classes additionnelles */
	className?: string;
}

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

// ============================================================================
// COMPONENT
// ============================================================================

const ParticleSystemBase = ({
	count = 6,
	size = [8, 64],
	opacity = [0.1, 0.4],
	colors = ["var(--color-primary)", "var(--color-secondary)"],
	blur = 20,
	duration = 20,
	className,
}: ParticleSystemProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();
	const isMobile = useIsMobile();

	// Évite l'hydration mismatch avec useSyncExternalStore (pattern React 19)
	const isMounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false
	);

	// Lazy rendering : n'anime que si visible
	const isInView = useInView(containerRef, { once: true, margin: "-100px" });

	// Réduire le nombre de particules sur mobile
	const particleCount = isMobile ? Math.ceil(count / 2) : count;

	// Génération déterministe des particules
	const particles = useMemo(() => {
		return Array.from({ length: particleCount }, (_, i) => {
			const seed = i * 1000;
			const particleSize = randomBetween(size[0], size[1], seed + 1);
			const particleOpacity = randomBetween(opacity[0], opacity[1], seed + 2);
			const x = randomBetween(5, 95, seed + 3);
			const y = randomBetween(5, 95, seed + 4);
			const color = colors[i % colors.length];
			const particleDuration = randomBetween(duration * 0.7, duration * 1.3, seed + 5);
			const delay = randomBetween(0, duration * 0.5, seed + 6);

			return {
				id: i,
				size: particleSize,
				opacity: particleOpacity,
				x,
				y,
				color,
				duration: particleDuration,
				delay,
			};
		});
	}, [particleCount, size, opacity, colors, duration]);

	// Ne rien rendre côté serveur pour éviter l'hydration mismatch
	if (!isMounted) {
		return null;
	}

	// Pas d'animation si reduced motion
	if (reducedMotion) {
		return (
			<div
				ref={containerRef}
				aria-hidden="true"
				className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
			>
				{particles.map((p) => (
					<span
						key={p.id}
						className="absolute rounded-full"
						style={{
							width: p.size,
							height: p.size,
							left: `${p.x}%`,
							top: `${p.y}%`,
							backgroundColor: p.color,
							opacity: p.opacity,
							filter: `blur(${blur}px)`,
						}}
					/>
				))}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
		>
			{isInView &&
				particles.map((p) => (
					<motion.span
						key={p.id}
						className="absolute rounded-full will-change-transform"
						style={{
							width: p.size,
							height: p.size,
							left: `${p.x}%`,
							top: `${p.y}%`,
							backgroundColor: p.color,
							filter: `blur(${blur}px)`,
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
		</div>
	);
};

/**
 * Système de particules décoratives
 *
 * @example
 * // Défaut
 * <ParticleSystem />
 *
 * // Personnalisé
 * <ParticleSystem count={8} size={[16, 80]} opacity={[0.2, 0.5]} />
 *
 * // Couleur unique
 * <ParticleSystem colors={["var(--color-primary)"]} />
 */
export const ParticleSystem = memo(ParticleSystemBase);
ParticleSystem.displayName = "ParticleSystem";
