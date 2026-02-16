"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef, useSyncExternalStore } from "react";
import { useIsTouchDevice } from "@/shared/hooks";

// Hydration safety pattern (évite mismatch server/client)
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Ligne statique (sans animation scroll)
 * Utilisée sur mobile/tactile et quand reduced-motion est activé
 */
function StaticLine() {
	return (
		<div
			className="absolute left-5 sm:left-6 top-6 bottom-6 z-0 hidden sm:block"
			aria-hidden="true"
		>
			<div className="absolute inset-0 w-0.5 sm:w-1 bg-secondary/40 rounded-full" />
		</div>
	);
}

/**
 * Ligne animée avec progression au scroll
 * Les hooks useScroll/useTransform sont isolés ici pour éviter
 * le tracking scroll sur les appareils tactiles
 */
function AnimatedLine() {
	const containerRef = useRef<HTMLDivElement>(null);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start 0.8", "end 0.5"],
	});

	const clipPath = useTransform(scrollYProgress, (v) => `inset(0 0 ${100 - v * 100}% 0)`);
	const opacity = useTransform(scrollYProgress, [0, 0.1], [0.3, 1]);

	return (
		<div ref={containerRef} className="absolute left-5 sm:left-6 top-6 bottom-6 z-0">
			{/* Ligne de fond (statique, légère) */}
			<div
				className="absolute inset-0 w-0.5 sm:w-1 bg-secondary/20 rounded-full"
				aria-hidden="true"
			/>
			{/* Ligne animée (progression) — clipPath is always GPU-composited */}
			<motion.div
				className="absolute top-0 left-0 w-0.5 sm:w-1 h-full bg-secondary/60 rounded-full"
				style={{
					clipPath,
					opacity,
				}}
				aria-hidden="true"
			/>
		</div>
	);
}

/**
 * Ligne de progression animée au scroll
 * S'agrandit de 0% à 100% au fur et à mesure du scroll
 *
 * Optimisation mobile: désactive le scroll tracking sur appareils tactiles
 * pour améliorer TBT/INP (économise ~5% TBT)
 *
 * Respecte prefers-reduced-motion
 */
export function ScrollProgressLine() {
	const prefersReducedMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	// Hydration safety : évite les mismatches server/client
	const isMounted = useSyncExternalStore(
		subscribeNoop,
		getClientSnapshot,
		getServerSnapshot
	);

	const shouldReduceMotion = isMounted && prefersReducedMotion;

	// Mobile/tactile ou reduced-motion : ligne statique (pas de scroll tracking)
	if (shouldReduceMotion || isTouchDevice) {
		return <StaticLine />;
	}

	return <AnimatedLine />;
}
