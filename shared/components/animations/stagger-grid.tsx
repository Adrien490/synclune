"use client";

import { m, useReducedMotion } from "motion/react";
import React, { isValidElement, type ReactNode, type Key } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface StaggerGridProps extends React.AriaAttributes {
	children: ReactNode;
	className?: string;
	/** Stagger delay between items (default: 0.06) */
	stagger?: number;
	/** Initial delay before first item (default: 0) */
	delay?: number;
	/** Y offset for entrance animation (default: 20) */
	y?: number;
	/** Scale factor for entrance (default: 0.95) */
	scale?: number;
	/** Enable scroll-triggered animation */
	inView?: boolean;
	/** Only animate once when entering viewport */
	once?: boolean;
	/** Portion of element visible to trigger (default: 0.1) */
	amount?: number;
	/** HTML role attribute */
	role?: string;
	/** Data attributes */
	[key: `data-${string}`]: string | undefined;
}

/** Extraire une key stable de l'enfant ou utiliser l'index comme fallback */
function getStableKey(child: ReactNode, index: number): Key {
	if (isValidElement(child) && child.key != null) {
		return child.key;
	}
	return index;
}

/**
 * Wrapper pour grilles avec animation stagger
 * Chaque enfant direct apparaît en cascade avec scale + fade
 * Idéal pour grilles de produits, collections, etc.
 * Respecte prefers-reduced-motion
 */
export function StaggerGrid({
	children,
	className,
	stagger = MOTION_CONFIG.stagger.normal,
	delay = 0,
	y = 20,
	scale = 0.95,
	inView = true,
	once = true,
	amount = 0.1,
	role,
	...rest
}: StaggerGridProps) {
	const shouldReduceMotion = useReducedMotion();

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
			scale: shouldReduceMotion ? 1 : scale,
		},
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				duration: shouldReduceMotion ? 0 : MOTION_CONFIG.duration.slow,
				ease: MOTION_CONFIG.easing.easeOut,
			},
		},
	};

	const childrenArray = Array.isArray(children) ? children : [children];

	if (inView) {
		return (
			<m.div
				className={className}
				role={role}
				initial="hidden"
				whileInView="visible"
				viewport={{ once, amount }}
				variants={containerVariants}
				{...rest}
			>
				{childrenArray.map((child, index) => (
					<m.div key={getStableKey(child, index)} variants={itemVariants}>
						{child}
					</m.div>
				))}
			</m.div>
		);
	}

	return (
		<m.div
			className={className}
			role={role}
			initial="hidden"
			animate="visible"
			variants={containerVariants}
			{...rest}
		>
			{childrenArray.map((child, index) => (
				<m.div key={getStableKey(child, index)} variants={itemVariants}>
					{child}
				</m.div>
			))}
		</m.div>
	);
}
