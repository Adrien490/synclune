"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { cn } from "@/shared/utils/cn";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

interface MobileStepCircleProps {
	index: number;
	color: string;
	intensity: { ring: string; shadow: string };
}

/**
 * Animated mobile step circle that activates when entering the viewport.
 * Transitions from opacity 0.5 + scale 0.9 to full visibility.
 * Respects prefers-reduced-motion.
 */
export function MobileStepCircle({ index, color, intensity }: MobileStepCircleProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.5 });
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			ref={ref}
			aria-hidden="true"
			className={cn(
				"flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:hidden",
				color,
				intensity.ring,
				intensity.shadow,
			)}
			initial={shouldReduceMotion ? false : { opacity: 0.5, scale: 0.9 }}
			animate={
				shouldReduceMotion
					? undefined
					: isInView
						? { opacity: 1, scale: 1 }
						: { opacity: 0.5, scale: 0.9 }
			}
			transition={
				shouldReduceMotion
					? undefined
					: { duration: MOTION_CONFIG.duration.emphasis, ease: MOTION_CONFIG.easing.easeOut }
			}
		>
			{index + 1}
		</motion.div>
	);
}
