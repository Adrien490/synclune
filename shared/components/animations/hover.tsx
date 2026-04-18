"use client";

import { m, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { useIsTouchDevice } from "@/shared/hooks";
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
 * Animation hover avec whileHover.
 *
 * Mobile native 2026: désactivé sur appareils tactiles pour éviter le sticky-focus
 * iOS Safari (tap déclenche hover figé jusqu'au prochain tap ailleurs).
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
	const isTouchDevice = useIsTouchDevice();
	const skipHover = shouldReduceMotion === true || isTouchDevice;

	return (
		<m.div
			className={className}
			whileHover={
				skipHover
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
		</m.div>
	);
}
