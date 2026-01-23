"use client";

import { motion, useReducedMotion } from "motion/react";
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

	// Désactiver l'animation sur appareils tactiles pour améliorer TBT/INP
	if (disableOnTouch && isTouchDevice) {
		return (
			<div className={className} role={role} {...rest}>
				{childrenArray.map((child, index) => (
					<div key={getStableKey(child, index)}>{child}</div>
				))}
			</div>
		);
	}

	// Variants pour gérer les animations avec ou sans inView
	const containerVariants = {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: shouldReduceMotion ? 0 : stagger,
				delayChildren: shouldReduceMotion ? 0 : delay,
			},
		},
	};

	const itemVariants = {
		hidden: {
			opacity: shouldReduceMotion ? 1 : 0,
			y: shouldReduceMotion ? 0 : y,
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: shouldReduceMotion ? 0 : MOTION_CONFIG.duration.normal,
				ease: MOTION_CONFIG.easing.easeOut,
			},
		},
	};

	if (inView) {
		return (
			<motion.div
				className={className}
				role={role}
				initial="hidden"
				whileInView="visible"
				viewport={{ once, amount }}
				variants={containerVariants}
				{...rest}
			>
				{childrenArray.map((child, index) => (
					<motion.div key={getStableKey(child, index)} variants={itemVariants}>
						{child}
					</motion.div>
				))}
			</motion.div>
		);
	}

	return (
		<motion.div
			className={className}
			role={role}
			initial="hidden"
			animate="visible"
			variants={containerVariants}
			{...rest}
		>
			{childrenArray.map((child, index) => (
				<motion.div key={getStableKey(child, index)} variants={itemVariants}>
					{child}
				</motion.div>
			))}
		</motion.div>
	);
}
