"use client";

import { useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import { useRef } from "react";
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
 * Uses direct DOM manipulation instead of React state to avoid
 * re-renders during scroll, which would interrupt Framer Motion animations.
 */
export function ActiveStepTracker({ children }: ActiveStepTrackerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const lastStepRef = useRef(-1);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start 0.6", "end 0.4"],
	});

	useMotionValueEvent(scrollYProgress, "change", (value) => {
		if (isTouchDevice || shouldReduceMotion) return;

		const el = containerRef.current;
		if (!el) return;

		let stepIndex: number;

		if (value <= 0) {
			stepIndex = -1;
		} else {
			stepIndex = Math.min(
				Math.floor(value * PROCESS_STEPS_COUNT),
				PROCESS_STEPS_COUNT - 1,
			);
		}

		// Skip DOM writes if nothing changed
		if (stepIndex === lastStepRef.current) return;
		lastStepRef.current = stepIndex;

		el.dataset.activeStep = String(stepIndex);

		// Update CSS custom properties directly on the DOM node
		for (let i = 0; i < PROCESS_STEPS_COUNT; i++) {
			let opacity: string;
			if (stepIndex < 0) {
				opacity = "1";
			} else if (i === stepIndex) {
				opacity = "1";
			} else if (i < stepIndex) {
				opacity = "0.6";
			} else {
				opacity = "0.8";
			}
			el.style.setProperty(`--step-${i}-opacity`, opacity);
		}
	});

	// On touch/reduced-motion: render without tracking
	if (isTouchDevice || shouldReduceMotion) {
		return <div ref={containerRef}>{children}</div>;
	}

	return (
		<div
			ref={containerRef}
			data-active-step="-1"
			className="[&_[data-step-index]]:motion-safe:transition-opacity [&_[data-step-index]]:motion-safe:duration-300"
		>
			{children}
		</div>
	);
}
