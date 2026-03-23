"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("motion/react").then((mod) => mod.domMax);

export function MotionProvider({ children }: { children: ReactNode }) {
	return (
		<LazyMotion features={loadFeatures}>
			<MotionConfig
				reducedMotion="user"
				transition={{
					duration: MOTION_CONFIG.duration.normal,
					ease: MOTION_CONFIG.easing.easeOut,
				}}
			>
				{children}
			</MotionConfig>
		</LazyMotion>
	);
}
