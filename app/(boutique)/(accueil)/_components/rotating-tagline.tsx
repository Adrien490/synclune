"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const adjectives = ["colorés", "uniques", "audacieux"];

/**
 * Tagline rotative pour le Hero
 *
 * "Des bijoux" + adjectif rotatif (colorés, uniques, audacieux)
 * Animation : fade + slide vertical
 * Respecte prefers-reduced-motion
 */
export function RotatingTagline() {
	const [currentIndex, setCurrentIndex] = useState(0);
	const shouldReduceMotion = useReducedMotion();

	useEffect(() => {
		if (shouldReduceMotion) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % adjectives.length);
		}, 3000);

		return () => clearInterval(interval);
	}, [shouldReduceMotion]);

	if (shouldReduceMotion) {
		return <span>Des bijoux {adjectives[0]}</span>;
	}

	return (
		<span className="inline-flex items-baseline gap-[0.3em]">
			<span>Des bijoux</span>
			<span className="relative inline-block h-[1.2em] overflow-hidden align-baseline">
				<AnimatePresence mode="wait">
					<motion.span
						key={currentIndex}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{
							duration: 0.4,
							ease: "easeInOut",
						}}
						className="absolute left-0 top-0"
					>
						{adjectives[currentIndex]}
					</motion.span>
				</AnimatePresence>
				{/* Réserve l'espace du plus long adjectif */}
				<span className="invisible" aria-hidden="true">
					{adjectives.reduce((a, b) => (a.length > b.length ? a : b))}
				</span>
			</span>
		</span>
	);
}
