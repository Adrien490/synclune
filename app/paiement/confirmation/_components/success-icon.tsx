"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { m, useReducedMotion } from "motion/react";
import { CircleCheck } from "lucide-react";
import { useEffect } from "react";

/**
 * Animated success icon for the order confirmation page.
 * Spring-based scale + rotate entrance for a celebratory feel.
 * Respects prefers-reduced-motion.
 */
export function SuccessIcon() {
	const shouldReduceMotion = useReducedMotion();

	useEffect(() => {
		triggerHaptic("success");
	}, []);

	if (shouldReduceMotion) {
		return (
			<div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
				<CircleCheck className="text-primary h-10 w-10" />
			</div>
		);
	}

	return (
		<m.div
			initial={{ opacity: 0, scale: 0.5 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{
				...MOTION_CONFIG.spring.success,
				delay: 0.2,
			}}
			className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
		>
			<m.div
				initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
				animate={{ scale: 1, opacity: 1, rotate: 0 }}
				transition={{
					...MOTION_CONFIG.spring.success,
					damping: 15,
					stiffness: 300,
					delay: 0.5,
				}}
			>
				<CircleCheck className="text-primary h-10 w-10" />
			</m.div>
		</m.div>
	);
}
