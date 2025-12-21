"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface SlideProps {
	children: ReactNode;
	className?: string;
	direction?: "up" | "down" | "left" | "right";
	distance?: number;
	delay?: number;
	duration?: number;
}

/**
 * Animation slide simple avec support prefers-reduced-motion
 */
export function Slide({
	children,
	className,
	direction = "up",
	distance = MOTION_CONFIG.transform.slideDistance,
	delay = 0,
	duration = MOTION_CONFIG.duration.normal,
}: SlideProps) {
	const shouldReduceMotion = useReducedMotion();

	const getInitial = () => {
		if (shouldReduceMotion) {
			return { opacity: 1, x: 0, y: 0 };
		}

		switch (direction) {
			case "up":
				return { opacity: 0, y: distance };
			case "down":
				return { opacity: 0, y: -distance };
			case "left":
				return { opacity: 0, x: distance };
			case "right":
				return { opacity: 0, x: -distance };
			default:
				return { opacity: 0, y: distance };
		}
	};

	return (
		<motion.div
			className={className}
			initial={getInitial()}
			animate={{ opacity: 1, x: 0, y: 0 }}
			transition={{
				duration: shouldReduceMotion ? 0 : duration,
				delay: shouldReduceMotion ? 0 : delay,
				ease: "easeOut",
			}}
		>
			{children}
		</motion.div>
	);
}
