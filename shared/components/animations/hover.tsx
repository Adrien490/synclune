"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface HoverProps {
	children: ReactNode;
	className?: string;
	scale?: number;
	y?: number;
	rotate?: number;
	opacity?: number;
	duration?: number;
}

/**
 * Animation hover avec whileHover
 * Améliore l'interactivité des éléments cliquables/survolables
 */
export function Hover({
	children,
	className,
	scale = 1.05,
	y = 0,
	rotate = 0,
	opacity = 1,
	duration = 0.2,
}: HoverProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			className={className}
			whileHover={
				shouldReduceMotion
					? undefined
					: {
							scale,
							y,
							rotate,
							opacity,
						}
			}
			transition={{
				duration,
				ease: MOTION_CONFIG.easing.easeOut,
			}}
		>
			{children}
		</motion.div>
	);
}
