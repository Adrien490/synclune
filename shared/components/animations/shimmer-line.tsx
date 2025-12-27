"use client";

import { motion, useReducedMotion } from "framer-motion";

export interface ShimmerLineProps {
	/** Largeur du trait de lumière (%) */
	width?: number;
	/** Durée de l'animation en secondes */
	duration?: number;
	/** Délai avant le démarrage */
	delay?: number;
	/** Répétition (Infinity ou nombre) */
	repeat?: number;
	className?: string;
}

/**
 * Effet de scintillement horizontal
 * Simule un reflet de lumière qui traverse l'élément parent
 */
export function ShimmerLine({
	width = 30,
	duration = 1.2,
	delay = 0,
	repeat = Infinity,
	className,
}: ShimmerLineProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) return null;

	return (
		<motion.div
			className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
		>
			<motion.div
				className="absolute inset-y-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
				style={{
					width: `${width}%`,
				}}
				initial={{ x: `-${width}%` }}
				animate={{ x: `${100 + width}%` }}
				transition={{
					duration,
					delay,
					repeat,
					ease: "easeInOut",
				}}
			/>
		</motion.div>
	);
}
