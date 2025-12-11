"use client";

import { cn } from "@/shared/utils/cn";
import { useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { DEFAULT_COLORS } from "./constants";
import { ParticleSet } from "./particle-set";
import type { ParticleSystemProps } from "./types";
import { generateParticles, normalizeShapes } from "./utils";

const ParticleSystemBase = ({
	count = 6,
	size = [8, 64],
	opacity = [0.1, 0.4],
	colors = DEFAULT_COLORS,
	blur = [12, 32],
	duration = 20,
	shape = "circle",
	className,
	animationStyle = "float",
	rotation = false,
	intensity = 1,
	glow = false,
	glowIntensity = 0.5,
	springPhysics = false,
	depthParallax = true,
	disabled = false,
	gradient = false,
}: ParticleSystemProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();

	// Skip rendering si désactivé
	if (disabled) return null;

	// Lazy rendering : n'anime que si visible
	const isInView = useInView(containerRef, { once: true, margin: "-100px" });

	// Normalise shape en tableau (support multi-formes)
	const shapes = normalizeShapes(shape);

	// Génération des deux sets de particules
	// CSS media queries gèrent l'affichage → pas de flash d'hydratation
	const desktopParticles = generateParticles(
		count,
		size,
		opacity,
		colors,
		duration,
		blur,
		depthParallax,
		shapes
	);
	const mobileParticles = generateParticles(
		Math.max(3, Math.ceil(count / 2)), // Minimum 3 particules sur mobile
		size,
		opacity,
		colors,
		duration,
		blur,
		depthParallax,
		shapes
	);

	// Props partagées pour ParticleSet
	const sharedProps = {
		isInView,
		reducedMotion,
		animationStyle,
		rotation,
		intensity,
		springPhysics,
		gradient,
	};

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
			style={{ contain: "layout paint" }}
		>
			{/* Desktop : visible uniquement sur md+ (768px+) - glow activé si demandé */}
			<div className="hidden md:contents">
				<ParticleSet
					particles={desktopParticles}
					glow={glow}
					glowIntensity={glowIntensity}
					{...sharedProps}
				/>
			</div>
			{/* Mobile : visible uniquement sous md (< 768px) - glow désactivé pour performance */}
			<div className="contents md:hidden">
				<ParticleSet
					particles={mobileParticles}
					glow={false}
					glowIntensity={0}
					{...sharedProps}
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
 * Glow désactivé automatiquement sur mobile pour performance.
 * CSS containment pour isoler les repaints.
 *
 * **Formes** : circle, diamond, soft-square, star, hexagon, ring, heart, crescent,
 *             pearl, drop, sparkle-4, butterfly-wing, flower-petal, leaf
 * **Animations** : float, twinkle, drift, pulse, shimmer, cascade, orbit, sway
 *
 * @example
 * // Défaut (couleurs primary/secondary/pastel)
 * <ParticleSystem />
 *
 * @example
 * // Multi-formes : mix diamants, étoiles et cercles
 * <ParticleSystem
 *   shape={["diamond", "star", "circle"]}
 *   colors={["var(--secondary)", "oklch(0.9 0.1 80)"]}
 *   blur={[4, 15]}
 * />
 *
 * @example
 * // Scintillement étoilé doré
 * <ParticleSystem
 *   shape="star"
 *   colors={["var(--secondary)", "oklch(0.9 0.1 80)"]}
 *   animationStyle="twinkle"
 *   glow
 * />
 *
 * @example
 * // Perles avec effet shimmer
 * <ParticleSystem
 *   shape="pearl"
 *   colors={["var(--secondary)", "oklch(0.95 0.04 80)"]}
 *   animationStyle="shimmer"
 *   gradient
 * />
 *
 * @example
 * // Pétales en cascade
 * <ParticleSystem
 *   shape={["flower-petal", "leaf"]}
 *   colors={["var(--primary)", "oklch(0.90 0.10 140)"]}
 *   animationStyle="cascade"
 *   rotation
 * />
 *
 * @example
 * // Désactiver complètement les particules
 * <ParticleSystem disabled />
 */
export { ParticleSystemBase as ParticleSystem };
