"use client";

import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useIsTouchDevice } from "@/shared/hooks";

function ScrollOverlayInner() {
	const ref = useRef<HTMLDivElement>(null);

	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	});

	const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.15, 0.15, 0]);

	return (
		<m.div
			ref={ref}
			className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
			style={{
				opacity,
				background: `linear-gradient(135deg, oklch(0.72 0.19 12 / 0.1), oklch(0.82 0.12 70 / 0.1))`,
			}}
			aria-hidden="true"
		/>
	);
}

/**
 * Scroll-linked gradient overlay on the atelier image.
 * Transitions from primary/10 to secondary/10 as user scrolls through the steps,
 * reflecting the progression from inspiration to finished result.
 *
 * Desktop only - disabled on touch devices for performance.
 * Respects prefers-reduced-motion.
 */
export function ImageScrollOverlay() {
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	if (isTouchDevice || shouldReduceMotion) {
		return null;
	}

	return <ScrollOverlayInner />;
}
