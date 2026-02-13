"use client";

import { useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useIsTouchDevice } from "@/shared/hooks";
import { PROCESS_STEPS_COUNT } from "@/shared/constants/process-steps";

interface ActiveStepTrackerProps {
	children: React.ReactNode;
}

/**
 * Tracks scroll progress through the creative process steps
 * and highlights the currently active step via data-attributes.
 *
 * Desktop only - disabled on touch devices for performance.
 * Respects prefers-reduced-motion.
 *
 * Applies CSS classes via data-active-step attribute on the container,
 * allowing children to style themselves with CSS selectors:
 * - [data-step-index="N"] within [data-active-step="N"] gets highlighted
 * - Past steps get reduced opacity
 */
export function ActiveStepTracker({ children }: ActiveStepTrackerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const [activeStep, setActiveStep] = useState(-1);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start 0.6", "end 0.4"],
	});

	useMotionValueEvent(scrollYProgress, "change", (value) => {
		if (isTouchDevice || shouldReduceMotion) return;

		// Divide scroll progress into equal segments for each step
		const stepIndex = Math.min(
			Math.floor(value * PROCESS_STEPS_COUNT),
			PROCESS_STEPS_COUNT - 1,
		);

		// Only before the section is visible, keep -1
		if (value <= 0) {
			setActiveStep(-1);
			return;
		}

		setActiveStep(stepIndex);
	});

	// On touch/reduced-motion: render without tracking
	if (isTouchDevice || shouldReduceMotion) {
		return <div ref={containerRef}>{children}</div>;
	}

	return (
		<div
			ref={containerRef}
			data-active-step={activeStep}
			className="[&_[data-step-index]]:motion-safe:transition-opacity [&_[data-step-index]]:motion-safe:duration-300"
			style={{
				// CSS-driven highlighting: dim past steps, highlight active
				...Object.fromEntries(
					Array.from({ length: PROCESS_STEPS_COUNT }, (_, i) => {
						const selector = `--step-${i}-opacity`;
						if (activeStep < 0) return [selector, "1"];
						if (i === activeStep) return [selector, "1"];
						if (i < activeStep) return [selector, "0.6"];
						return [selector, "0.8"];
					}),
				),
			} as React.CSSProperties}
		>
			{children}
		</div>
	);
}
