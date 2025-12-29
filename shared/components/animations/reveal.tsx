"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";
import { MOTION_CONFIG } from "./motion.config";
import type { RevealProps } from "./types";

export type { RevealProps };

// useSyncExternalStore pour détecter le montage client sans useEffect
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Animation reveal avec whileInView (scroll-triggered)
 * L'animation se déclenche quand l'élément entre dans le viewport
 *
 * Fix hydratation: On assume toujours une animation normale côté serveur
 * et on ajuste côté client si reduced motion est activé
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
	...rest
}: RevealProps) {
	const prefersReducedMotion = useReducedMotion();
	// useSyncExternalStore: false côté serveur, true côté client (pas d'hydration mismatch)
	const isClient = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

	// Côté serveur et première hydratation: toujours avec animation
	// Côté client après mount: respecte les préférences utilisateur
	const shouldReduceMotion = isClient && prefersReducedMotion;

	return (
		<motion.div
			className={className}
			role={role}
			initial={{ opacity: 0, y }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once, amount }}
			transition={{
				duration: shouldReduceMotion ? 0 : duration,
				delay: shouldReduceMotion ? 0 : delay,
				ease: "easeOut",
			}}
			{...rest}
		>
			{children}
		</motion.div>
	);
}
