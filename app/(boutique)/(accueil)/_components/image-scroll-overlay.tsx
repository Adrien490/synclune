"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { useIsTouchDevice } from "@/shared/hooks";

/**
 * Scroll-linked gradient overlay on the atelier image.
 * Transitions from primary/10 to secondary/10 as user scrolls through the steps,
 * reflecting the progression from inspiration to finished result.
 *
 * Desktop only - disabled on touch devices for performance.
 * Respects prefers-reduced-motion.
 */
export function ImageScrollOverlay() {
	const ref = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	});

	const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.15, 0.15, 0]);

	// Disabled on mobile/touch or reduced-motion
	if (isTouchDevice || shouldReduceMotion) {
		return null;
	}

	return (
		<motion.div
			ref={ref}
			className="absolute inset-0 z-[1] pointer-events-none hidden lg:block"
			style={{
				opacity,
				background: `linear-gradient(135deg, oklch(0.72 0.19 12 / 0.1), oklch(0.82 0.12 70 / 0.1))`,
			}}
			aria-hidden="true"
		/>
	);
}
