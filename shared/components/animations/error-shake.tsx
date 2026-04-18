"use client";

import { cn } from "@/shared/utils/cn";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { m, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
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
	/** Désactiver le retour haptique (défaut: false). Skip auto si reduced motion. */
	disableHaptic?: boolean;
}

/**
 * Wrapper pour ajouter un effet de shake horizontal sur erreur
 * Idéal pour les formulaires avec erreurs de validation
 *
 * Accessibilité: en mode reduced motion, remplace le shake par un flash
 * visuel (outline rouge) car le feedback d'erreur est fonctionnel, pas décoratif.
 *
 * Mobile native 2026: déclenche un haptic "error" (pattern [30,50,30]) à l'activation.
 */
export function ErrorShake({
	children,
	className,
	shake,
	intensity = 10,
	duration = MOTION_CONFIG.duration.slow,
	onShakeComplete,
	disableHaptic = false,
}: ErrorShakeProps) {
	const shouldReduceMotion = useReducedMotion();
	const triggerHaptic = useHaptic();

	const showFlash = shake && shouldReduceMotion;

	const shakeAnimation =
		shake && !shouldReduceMotion
			? { x: [0, -intensity, intensity, -intensity, intensity, 0] }
			: { x: 0 };

	useEffect(() => {
		if (!shake || disableHaptic) return;
		triggerHaptic("error");
	}, [shake, disableHaptic, triggerHaptic]);

	return (
		<m.div
			className={cn(
				className,
				showFlash && "outline-destructive rounded outline-2 outline-offset-2",
			)}
			animate={shakeAnimation}
			transition={{
				duration: shouldReduceMotion ? 0 : duration,
				ease: MOTION_CONFIG.easing.easeOut,
			}}
			onAnimationComplete={() => {
				if (shake && onShakeComplete) {
					onShakeComplete();
				}
			}}
		>
			{children}
		</m.div>
	);
}
