"use client";

import { useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { cn } from "@/shared/utils/cn";
import { seededRandom } from "@/shared/utils/seeded-random";
import { MOTION_CONFIG } from "./motion.config";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Petit cœur (viewBox 0 0 24 24) — path local, indépendant de `AnimatedHeartIcon`
 * dont le `HEART_PATH` n'est pas exporté (KISS, pas de dépendance croisée).
 */
const MINI_HEART_PATH =
	"M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/**
 * 6 mini-cœurs répartis en éventail vers le haut (-70° à +70° autour de la verticale),
 * distances et tailles variées pour un rendu organique. Couleurs alternées thème.
 * Jitter seedé + facteur d'échelle sont appliqués au render (cf. composant).
 */
const PARTICLES = [
	{ angle: -70, distance: 30, size: 10, color: "var(--primary)" },
	{ angle: -38, distance: 38, size: 8, color: "var(--secondary)" },
	{ angle: -12, distance: 34, size: 11, color: "var(--primary)" },
	{ angle: 14, distance: 36, size: 9, color: "var(--secondary)" },
	{ angle: 42, distance: 38, size: 8, color: "var(--primary)" },
	{ angle: 70, distance: 30, size: 10, color: "var(--secondary)" },
] as const;

/** Durée de vie d'une particule (s) — fade géré par tween `times` explicites. */
const PARTICLE_LIFETIME = 0.7;

// ============================================================================
// COMPONENT
// ============================================================================

interface HeartBurstProps {
	className?: string;
	/**
	 * Facteur d'échelle du burst (distances + tailles), à aligner sur la taille du
	 * bouton cible. Défaut `1` (bouton 44px). Ex: `0.85` (sm/36px), `1.25` (lg/56px).
	 */
	scale?: number;
	/**
	 * Graine de variation déterministe — passer le compteur de remount (`burstKey`)
	 * pour qu'un like répété ne rejoue jamais exactement le même éventail.
	 */
	seed?: number;
}

/**
 * Burst de mini-cœurs façon « like » — one-shot décoratif.
 *
 * À monter avec une `key` qui change à chaque déclenchement (remount = re-jeu).
 * Les particules jaillissent du centre vers l'extérieur en éventail, retombent
 * légèrement (gravité) puis s'estompent. Le composant se démonte tout seul une fois
 * l'animation terminée (`done`), ne laissant aucun nœud inerte dans le DOM.
 *
 * - Purement décoratif (`aria-hidden`, `pointer-events-none`) — invisible SR/clavier.
 * - Respecte `prefers-reduced-motion` (rendu `null`, aucun layout shift).
 * - À placer dans un conteneur positionné, en overlay centré sur l'icône cible.
 *
 * @example
 * ```tsx
 * <span className="relative inline-flex">
 *   <Button>…</Button>
 *   {burstKey > 0 && <HeartBurst key={burstKey} seed={burstKey} scale={1.25} />}
 * </span>
 * ```
 */
export function HeartBurst({ className, scale = 1, seed = 0 }: HeartBurstProps) {
	const shouldReduceMotion = useReducedMotion();
	const [done, setDone] = useState(false);

	if (shouldReduceMotion || done) {
		return null;
	}

	const lastIndex = PARTICLES.length - 1;

	return (
		<span
			className={cn(
				"pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible",
				className,
			)}
			aria-hidden="true"
			data-testid="heart-burst"
		>
			{PARTICLES.map((p, i) => {
				// Jitter déterministe : ±6° sur l'angle, ±3px sur la distance.
				const angleJitter = (seededRandom(seed + i + 1) - 0.5) * 12;
				const distJitter = (seededRandom(seed + i + 50) - 0.5) * 6;
				const rad = (p.angle + angleJitter - 90) * (Math.PI / 180);
				const distance = (p.distance + distJitter) * scale;
				const x = Math.cos(rad) * distance;
				const y = Math.sin(rad) * distance;
				const drift = 6 * scale; // retombée gravité en fin de course
				const delay = i * 0.03;

				return (
					<m.svg
						key={p.angle}
						width={p.size * scale}
						height={p.size * scale}
						viewBox="0 0 24 24"
						fill={p.color}
						className="absolute drop-shadow-[0_0_2px_rgba(255,255,255,0.85)]"
						initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
						animate={{
							x,
							y: [0, y, y + drift],
							scale: [0, 1, 0.6],
							opacity: [1, 1, 0],
							rotate: (p.angle + angleJitter) * 0.4,
						}}
						transition={{
							x: { ...MOTION_CONFIG.spring.bouncy, delay },
							rotate: { ...MOTION_CONFIG.spring.bouncy, delay },
							y: { duration: PARTICLE_LIFETIME, times: [0, 0.6, 1], ease: "easeOut", delay },
							scale: { duration: PARTICLE_LIFETIME, times: [0, 0.3, 1], ease: "easeOut", delay },
							opacity: { duration: PARTICLE_LIFETIME, times: [0, 0.55, 1], ease: "easeOut", delay },
						}}
						onAnimationComplete={i === lastIndex ? () => setDone(true) : undefined}
					>
						<path d={MINI_HEART_PATH} />
					</m.svg>
				);
			})}
		</span>
	);
}
