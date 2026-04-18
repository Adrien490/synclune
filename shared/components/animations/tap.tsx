"use client";

import { m, useReducedMotion } from "motion/react";
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
 * Animation tap/click avec whileTap.
 * - whileTap respecte prefers-reduced-motion
 * - n'altère pas le focus management des enfants (pas de tabIndex forcé)
 */
export function Tap({ children, className, scale = 0.97, duration = 0.1, role }: TapProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<m.div
			className={className}
			role={role}
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
		</m.div>
	);
}
