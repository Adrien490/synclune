"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface TapProps {
	children: ReactNode;
	className?: string;
	scale?: number;
	duration?: number;
	role?: string;
}

/**
 * Animation tap/click avec whileTap
 * Feedback tactile pour les boutons et éléments cliquables
 */
export function Tap({
	children,
	className,
	scale = 0.97,
	duration = 0.1,
	role,
}: TapProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			className={className}
			role={role}
			tabIndex={-1}
			whileTap={
				shouldReduceMotion
					? undefined
					: {
							scale,
						}
			}
			transition={{
				duration,
				ease: MOTION_CONFIG.easing.easeInOut,
			}}
		>
			{children}
		</motion.div>
	);
}
