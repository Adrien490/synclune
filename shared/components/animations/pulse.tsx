"use client";

import { m, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface PulseProps {
	children: ReactNode;
	className?: string;
	scale?: number;
	duration?: number;
	repeat?: number;
	delay?: number;
}

/**
 * Animation pulse pour attirer l'attention
 * Idéal pour badges de notification, indicateurs de changement
 */
export function Pulse({
	children,
	className,
	scale = 1.1,
	duration = 1,
	repeat = Infinity,
	delay = 0,
}: PulseProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<m.div
			className={className}
			animate={
				shouldReduceMotion
					? undefined
					: {
							scale: [1, scale, 1],
						}
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
