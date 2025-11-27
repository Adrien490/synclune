"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

export interface PresenceProps {
	children: ReactNode;
	mode?: "wait" | "sync" | "popLayout";
	initial?: boolean;
	exitBeforeEnter?: boolean;
	className?: string;
	/**
	 * Type d'animation de sortie
	 */
	exit?: "fade" | "scale" | "slideUp" | "slideDown" | "slideLeft" | "slideRight";
	/**
	 * Durée de l'animation
	 */
	duration?: number;
}

/**
 * Wrapper AnimatePresence amélioré
 * Gère les animations d'entrée/sortie pour les éléments conditionnels
 * Idéal pour modals, toasts, dropdowns, tooltips
 */
export function Presence({
	children,
	mode = "wait",
	initial = true,
	className,
	exit = "fade",
	duration = 0.2,
}: PresenceProps) {
	const shouldReduceMotion = useReducedMotion();

	const exitVariants = {
		fade: { opacity: 0 },
		scale: { opacity: 0, scale: 0.95 },
		slideUp: { opacity: 0, y: -20 },
		slideDown: { opacity: 0, y: 20 },
		slideLeft: { opacity: 0, x: -20 },
		slideRight: { opacity: 0, x: 20 },
	};

	if (shouldReduceMotion) {
		return <>{children}</>;
	}

	return (
		<AnimatePresence mode={mode} initial={initial}>
			<motion.div
				className={className}
				exit={exitVariants[exit]}
				transition={{
					duration,
					ease: "easeInOut",
				}}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}
