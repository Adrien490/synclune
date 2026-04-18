"use client";

import { m, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { useHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
import { MOTION_CONFIG } from "./motion.config";

export interface TapProps {
	children: ReactNode;
	className?: string;
	scale?: number;
	duration?: number;
	role?: string;
	/** Pattern haptic déclenché au tap (défaut: "selection"). Passer false pour désactiver. */
	haptic?: HapticPattern | false;
}

/**
 * Animation tap/click avec whileTap + haptic mobile (Vibration API).
 * - whileTap respecte prefers-reduced-motion
 * - haptic désactivé automatiquement si reduced motion ou device non-touch
 * - n'altère pas le focus management des enfants (pas de tabIndex forcé)
 */
export function Tap({
	children,
	className,
	scale = 0.97,
	duration = 0.1,
	role,
	haptic = "selection",
}: TapProps) {
	const shouldReduceMotion = useReducedMotion();
	const triggerHaptic = useHaptic();

	const handleTapStart = () => {
		if (haptic === false) return;
		triggerHaptic(haptic);
	};

	return (
		<m.div
			className={className}
			role={role}
			onTapStart={handleTapStart}
			whileTap={
				shouldReduceMotion
					? undefined
					: {
							scale,
						}
			}
			transition={{
				duration,
				ease: MOTION_CONFIG.easing.easeInOut,
			}}
		>
			{children}
		</m.div>
	);
}
