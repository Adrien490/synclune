"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

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
	scale = 0.95,
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
				ease: "easeInOut",
			}}
		>
			{children}
		</motion.div>
	);
}
