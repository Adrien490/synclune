"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface PulseProps {
	children: ReactNode;
	className?: string;
	scale?: number;
	duration?: number;
	/** Nombre de cycles (défaut: 3). Passer Infinity pour boucler indéfiniment. */
	repeat?: number;
	delay?: number;
	/** Pause l'animation hors viewport pour épargner GPU mobile (défaut: true) */
	pauseOnOutOfView?: boolean;
}

/**
 * Animation pulse pour attirer l'attention
 * Idéal pour badges de notification, indicateurs de changement.
 *
 * Mobile native 2026:
 * - repeat fini par défaut (3) — évite le GPU drain sur iPhone 12 / Android low-end
 * - pauseOnOutOfView via IntersectionObserver — animation suspendue hors viewport
 * - Respecte prefers-reduced-motion
 */
export function Pulse({
	children,
	className,
	scale = 1.1,
	duration = 1,
	repeat = 3,
	delay = 0,
	pauseOnOutOfView = true,
}: PulseProps) {
	const shouldReduceMotion = useReducedMotion();
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { margin: "50px" });

	const shouldAnimate = !shouldReduceMotion && (!pauseOnOutOfView || isInView);

	return (
		<m.div
			ref={ref}
			className={className}
			animate={
				shouldAnimate
					? {
							scale: [1, scale, 1],
						}
					: undefined
			}
			transition={{
				duration,
				repeat,
				delay,
				ease: MOTION_CONFIG.easing.easeInOut,
			}}
		>
			{children}
		</m.div>
	);
}
