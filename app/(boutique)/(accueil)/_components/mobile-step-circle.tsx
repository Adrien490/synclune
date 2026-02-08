"use client";

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

	if (shouldReduceMotion) {
		return (
			<div
				ref={ref}
				aria-hidden="true"
				className={cn(
					"flex sm:hidden shrink-0 w-12 h-12 rounded-full items-center justify-center font-bold text-lg",
					color,
					intensity.ring,
					intensity.shadow,
				)}
			>
				{index + 1}
			</div>
		);
	}

	return (
		<motion.div
			ref={ref}
			aria-hidden="true"
			className={cn(
				"flex sm:hidden shrink-0 w-12 h-12 rounded-full items-center justify-center font-bold text-lg",
				color,
				intensity.ring,
				intensity.shadow,
			)}
			initial={{ opacity: 0.5, scale: 0.9 }}
			animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0.5, scale: 0.9 }}
			transition={{ duration: 0.4, ease: "easeOut" }}
		>
			{index + 1}
		</motion.div>
	);
}
