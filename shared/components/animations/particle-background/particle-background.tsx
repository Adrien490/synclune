"use client";

import { cn } from "@/shared/utils/cn";
import { useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { DEFAULT_COLORS } from "./constants";
import { ParticleSet } from "./particle-set";
import type { ParticleBackgroundProps } from "./types";
import { generateParticles } from "./utils";

/**
 * Système de particules décoratives avec effet de profondeur
 *
 * Utilise CSS media queries pour la détection mobile (pas de flash d'hydratation).
 * Desktop: count particules, Mobile: count/2 particules.
 * CSS containment pour isoler les repaints.
 *
 * **Formes** : circle, diamond, heart, crescent, pearl, drop, sparkle-4
 * **Animations** : float, drift
 *
 * @example
 * // Défaut (couleurs primary/secondary/pastel)
 * <ParticleBackground />
 *
 * @example
 * // Multi-formes : mix diamants et cercles
 * <ParticleBackground
 *   shape={["diamond", "circle"]}
 *   colors={["var(--secondary)", "oklch(0.9 0.1 80)"]}
 *   blur={[4, 15]}
 * />
 */
export function ParticleBackground({
	count = 6,
	size = [8, 64],
	opacity = [0.1, 0.4],
	colors = DEFAULT_COLORS,
	blur = [12, 32],
	shape = "circle",
	className,
	animationStyle = "float",
	depthParallax = true,
}: ParticleBackgroundProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();
	const isInView = useInView(containerRef, { margin: "-100px" });

	// Normalise shape en tableau
	const shapes = Array.isArray(shape) ? shape : [shape];

	// Blur réduit de 30% sur mobile
	const mobileBlur: [number, number] = Array.isArray(blur)
		? [blur[0] * 0.7, blur[1] * 0.7]
		: [blur * 0.7, blur * 0.7];

	// Desktop: durée 20s, Mobile: durée 12s (économie batterie)
	const desktopParticles = generateParticles(count, size, opacity, colors, blur, depthParallax, shapes, 20);
	const mobileParticles = generateParticles(Math.ceil(count / 2), size, opacity, colors, mobileBlur, depthParallax, shapes, 12);

	const sharedProps = { isInView, reducedMotion, animationStyle };

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
			style={{ contain: "layout paint" }}
		>
			<div className="hidden md:contents">
				<ParticleSet particles={desktopParticles} {...sharedProps} />
			</div>
			<div className="contents md:hidden">
				<ParticleSet particles={mobileParticles} {...sharedProps} />
			</div>
		</div>
	);
}
