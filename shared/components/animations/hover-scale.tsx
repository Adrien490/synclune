"use client";

import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface HoverScaleProps {
	children: ReactNode;
	className?: string;
	/** Scale factor on hover (default: 1.02) */
	scale?: number;
	/** Y offset on hover in pixels (default: -4) */
	y?: number;
	/** Enable shadow effect on hover */
	shadow?: boolean;
	/** Custom transition duration */
	duration?: number;
}

/**
 * Wrapper pour ajouter un effet de scale + lift au hover
 * Idéal pour les cartes produit, collections, etc.
 * Respecte prefers-reduced-motion
 */
export function HoverScale({
	children,
	className,
	scale = 1.02,
	y = -4,
	shadow = true,
	duration = MOTION_CONFIG.duration.normal,
}: HoverScaleProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<m.div
			className={className}
			whileHover={
				shouldReduceMotion
					? undefined
					: {
							scale,
							y,
						}
			}
			transition={{
				duration,
				ease: MOTION_CONFIG.easing.easeOut,
			}}
			style={
				shadow
					? {
							// Shadow will be handled by CSS for better performance
						}
					: undefined
			}
		>
			{children}
		</m.div>
	);
}
