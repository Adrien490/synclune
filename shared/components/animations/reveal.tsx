"use client";

import { m, useReducedMotion } from "motion/react";
import { useIsTouchDevice, useMounted } from "@/shared/hooks";
import { MOTION_CONFIG } from "./motion.config";
import type { RevealProps } from "./types";

export type { RevealProps };

/**
 * Animation reveal avec whileInView (scroll-triggered)
 * L'animation se déclenche quand l'élément entre dans le viewport
 *
 * Fix hydratation: On assume toujours une animation normale côté serveur
 * et on ajuste côté client si reduced motion est activé
 *
 * @param disableOnTouch - Désactiver l'animation sur appareils tactiles (défaut: false)
 */
export function Reveal({
	children,
	className,
	delay = 0,
	duration = MOTION_CONFIG.duration.normal,
	y = MOTION_CONFIG.transform.fadeY,
	once = true,
	amount = 0.2,
	role,
	disableOnTouch = false,
	...rest
}: RevealProps) {
	const prefersReducedMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const isClient = useMounted();

	// Côté serveur et première hydratation: toujours avec animation
	// Côté client après mount: respecte les préférences utilisateur
	const shouldReduceMotion = isClient && prefersReducedMotion;
	const skipAnimation = (disableOnTouch && isTouchDevice) || shouldReduceMotion;

	const animationProps = skipAnimation
		? {}
		: {
				initial: { opacity: 0, y },
				whileInView: { opacity: 1, y: 0 },
				viewport: { once, amount },
				transition: {
					duration,
					delay,
					ease: MOTION_CONFIG.easing.easeOut,
				},
			};

	return (
		<m.div className={className} role={role} {...animationProps} {...rest}>
			{children}
		</m.div>
	);
}
