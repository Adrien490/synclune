"use client";

import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { m, useReducedMotion } from "motion/react";
import { Logo } from "./logo";
import type { ComponentProps } from "react";

type LogoAnimatedProps = ComponentProps<typeof Logo>;

export function LogoAnimated(props: LogoAnimatedProps) {
	const prefersReducedMotion = useReducedMotion();

	return (
		<m.div
			initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={maybeReduceMotion(
				{ duration: MOTION_CONFIG.duration.emphasis, ease: MOTION_CONFIG.easing.easeOut },
				!!prefersReducedMotion,
			)}
		>
			<Logo {...props} />
		</m.div>
	);
}
