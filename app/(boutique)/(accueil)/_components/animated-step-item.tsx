"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { useIsTouchDevice } from "@/shared/hooks";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

interface AnimatedStepItemProps {
	index: number;
	className?: string;
	style?: CSSProperties;
	children: ReactNode;
	"data-step-index"?: number;
}

/**
 * Animated list item for the creative process timeline.
 * Renders a `<motion.li>` with whileInView stagger animation,
 * replacing Stagger + li combo to maintain valid list structure.
 */
export function AnimatedStepItem({
	index,
	className,
	style,
	children,
	...rest
}: AnimatedStepItemProps) {
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	const skipAnimation = shouldReduceMotion || isTouchDevice;

	if (skipAnimation) {
		return (
			<li className={className} style={style} {...rest}>
				{children}
			</li>
		);
	}

	return (
		<motion.li
			className={className}
			style={{ willChange: "transform, opacity", ...style }}
			initial={{ opacity: 0, y: MOTION_CONFIG.section.timeline.y }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.2 }}
			transition={{
				duration: MOTION_CONFIG.duration.slower,
				ease: MOTION_CONFIG.easing.easeOut,
				delay: index * 0.15,
			}}
			{...rest}
		>
			{children}
		</motion.li>
	);
}
