"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

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
		<motion.div
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
				ease: "easeInOut",
			}}
		>
			{children}
		</motion.div>
	);
}
