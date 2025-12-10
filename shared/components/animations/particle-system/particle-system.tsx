"use client";

import { cn } from "@/shared/utils/cn";
import { useInView, useReducedMotion } from "framer-motion";
import { memo, useRef } from "react";
import { DEFAULT_COLORS } from "./constants";
import { ParticleSet } from "./particle-set";
import type { ParticleSystemProps } from "./types";
import { generateParticles } from "./utils";

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
}: ParticleSystemProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();

	// Lazy rendering : n'anime que si visible
	const isInView = useInView(containerRef, { once: true, margin: "-100px" });

	// Génération des deux sets de particules
	// CSS media queries gèrent l'affichage → pas de flash d'hydratation
	const desktopParticles = generateParticles(
		count,
		size,
		opacity,
		colors,
		duration,
		blur,
		depthParallax
	);
	const mobileParticles = generateParticles(
		Math.ceil(count / 2),
		size,
		opacity,
		colors,
		duration,
		blur,
		depthParallax
	);

	// Props partagées pour ParticleSet
	const sharedProps = {
		shape,
		isInView,
		reducedMotion,
		animationStyle,
		rotation,
		intensity,
		springPhysics,
	};

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
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
 *
 * **Formes** : circle, diamond, soft-square, star, hexagon, ring, heart, crescent
 * **Animations** : float, twinkle, drift, pulse
 *
 * @example
 * // Défaut (couleurs primary/secondary/pastel)
 * <ParticleSystem />
 *
 * @example
 * // Avec preset
 * import { PARTICLE_PRESETS } from "./particle-system"
 * <ParticleSystem {...PARTICLE_PRESETS.hero} />
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
 * // Coeurs roses avec rotation
 * <ParticleSystem
 *   shape="heart"
 *   colors={["var(--primary)", "oklch(0.92 0.08 350)"]}
 *   animationStyle="drift"
 *   rotation
 * />
 */
export const ParticleSystem = memo(ParticleSystemBase);
ParticleSystem.displayName = "ParticleSystem";
