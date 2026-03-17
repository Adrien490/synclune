"use client";

import { m, useReducedMotion } from "motion/react";
import { Children, isValidElement, type ReactNode, type Key } from "react";
import { useIsTouchDevice } from "@/shared/hooks";
import { MOTION_CONFIG } from "./motion.config";
import type { StaggerProps } from "./types";

/** Extraire une key stable de l'enfant ou utiliser l'index comme fallback */
function getStableKey(child: ReactNode, index: number): Key {
	if (isValidElement(child) && child.key != null) {
		return child.key;
	}
	return index;
}

export type { StaggerProps };

/**
 * Animation stagger ultra-simple avec support prefers-reduced-motion
 * Chaque enfant reçoit un delay croissant
 * Supporte whileInView pour animations au scroll
 *
 * Note: willChange retiré pour meilleure performance GPU.
 * Framer Motion optimise déjà les animations avec transform et opacity.
 *
 * @param disableOnTouch - Désactiver l'animation sur appareils tactiles (défaut: false)
 */
export function Stagger({
	children,
	className,
	stagger = MOTION_CONFIG.stagger.normal,
	delay = 0,
	y = 20,
	inView = false,
	once = true,
	amount = 0.2,
	role,
	disableOnTouch = false,
	...rest
}: StaggerProps) {
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const childrenArray = Children.toArray(children);

	const skipAnimation = (disableOnTouch && isTouchDevice) || shouldReduceMotion;

	// Variants pour gérer les animations avec ou sans inView
	const containerVariants = skipAnimation
		? undefined
		: {
				hidden: {},
				visible: {
					transition: {
						staggerChildren: stagger,
						delayChildren: delay,
					},
				},
			};

	const itemVariants = skipAnimation
		? undefined
		: {
				hidden: { opacity: 0, y },
				visible: {
					opacity: 1,
					y: 0,
					transition: {
						duration: MOTION_CONFIG.duration.normal,
						ease: MOTION_CONFIG.easing.easeOut,
					},
				},
			};

	const containerProps = skipAnimation
		? {}
		: inView
			? {
					initial: "hidden" as const,
					whileInView: "visible" as const,
					viewport: { once, amount },
					variants: containerVariants,
				}
			: {
					initial: "hidden" as const,
					animate: "visible" as const,
					variants: containerVariants,
				};

	return (
		<m.div className={className} role={role} {...containerProps} {...rest}>
			{childrenArray.map((child, index) => (
				<m.div key={getStableKey(child, index)} variants={itemVariants}>
					{child}
				</m.div>
			))}
		</m.div>
	);
}
