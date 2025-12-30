"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface ErrorShakeProps {
	children: ReactNode;
	className?: string;
	/** Trigger the shake animation */
	shake: boolean;
	/** Shake intensity in pixels (default: 10) */
	intensity?: number;
	/** Animation duration (default: 0.4) */
	duration?: number;
	/** Callback when shake animation completes */
	onShakeComplete?: () => void;
}

/**
 * Wrapper pour ajouter un effet de shake horizontal sur erreur
 * Idéal pour les formulaires avec erreurs de validation
 * Respecte prefers-reduced-motion
 */
export function ErrorShake({
	children,
	className,
	shake,
	intensity = 10,
	duration = MOTION_CONFIG.duration.slow,
	onShakeComplete,
}: ErrorShakeProps) {
	const shouldReduceMotion = useReducedMotion();

	const shakeAnimation = shake && !shouldReduceMotion
		? { x: [0, -intensity, intensity, -intensity, intensity, 0] }
		: { x: 0 };

	return (
		<motion.div
			className={className}
			animate={shakeAnimation}
			transition={{
				duration,
				ease: MOTION_CONFIG.easing.easeOut,
			}}
			onAnimationComplete={() => {
				if (shake && onShakeComplete) {
					onShakeComplete();
				}
			}}
		>
			{children}
		</motion.div>
	);
}
