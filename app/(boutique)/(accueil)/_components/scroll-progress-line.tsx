"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef, useSyncExternalStore } from "react";

interface ScrollProgressLineProps {
	className?: string;
}

// Hydration safety pattern (évite mismatch server/client)
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Ligne de progression animée au scroll
 * S'agrandit de 0% à 100% au fur et à mesure du scroll
 * Respecte prefers-reduced-motion
 */
export function ScrollProgressLine({ className }: ScrollProgressLineProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();

	// Hydration safety : évite les mismatches useReducedMotion server/client
	const isMounted = useSyncExternalStore(
		subscribeNoop,
		getClientSnapshot,
		getServerSnapshot
	);

	const shouldReduceMotion = isMounted && prefersReducedMotion;

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start 0.8", "end 0.5"],
	});

	const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
	const opacity = useTransform(scrollYProgress, [0, 0.1], [0.3, 1]);

	// Reduced motion : affiche une ligne statique (repère visuel conservé)
	if (shouldReduceMotion) {
		return (
			<div
				ref={containerRef}
				className="absolute left-5 sm:left-6 top-6 bottom-6 z-0 hidden sm:block"
				aria-hidden="true"
			>
				<div className="absolute inset-0 w-0.5 sm:w-1 bg-secondary/40 rounded-full" />
			</div>
		);
	}

	return (
		<div ref={containerRef} className="absolute left-5 sm:left-6 top-6 bottom-6 z-0">
			{/* Ligne de fond (statique, légère) */}
			<div
				className="absolute inset-0 w-0.5 sm:w-1 bg-secondary/20 rounded-full"
				aria-hidden="true"
			/>
			{/* Ligne animée (progression) */}
			<motion.div
				className="absolute top-0 left-0 w-0.5 sm:w-1 bg-secondary/60 rounded-full origin-top"
				style={{
					scaleY,
					opacity,
					height: "100%",
				}}
				aria-hidden="true"
			/>
		</div>
	);
}
