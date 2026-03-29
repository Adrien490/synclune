"use client";

import { m } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

interface KpiCardAnimatedProps {
	children: React.ReactNode;
	index: number;
}

/**
 * Wrapper that applies staggered fade-in animation to KPI cards
 * Respects prefers-reduced-motion via global MotionConfig
 */
export function KpiCardAnimated({ children, index }: KpiCardAnimatedProps) {
	return (
		<m.div
			initial={{ opacity: 0, y: MOTION_CONFIG.transform.fadeY }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				delay: index * MOTION_CONFIG.stagger.normal,
				...MOTION_CONFIG.spring.gentle,
			}}
		>
			{children}
		</m.div>
	);
}
