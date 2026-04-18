"use client";

import { m, useReducedMotion } from "motion/react";
import { useIsTouchDevice } from "@/shared/hooks";
import { MOTION_CONFIG } from "./motion.config";
import type { SlideProps } from "./types";

export function Slide({
	children,
	className,
	direction = "up",
	distance = MOTION_CONFIG.transform.slideDistance,
	delay = 0,
	duration = MOTION_CONFIG.duration.normal,
	inView = false,
	once = true,
	disableOnTouch = false,
}: SlideProps) {
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const skipAnimation = (disableOnTouch && isTouchDevice) || shouldReduceMotion;

	const getInitial = () => {
		if (skipAnimation) {
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

	const transition = {
		duration: skipAnimation ? 0 : duration,
		delay: skipAnimation ? 0 : delay,
		ease: MOTION_CONFIG.easing.easeOut,
	};

	if (inView && !skipAnimation) {
		return (
			<m.div
				className={className}
				initial={getInitial()}
				whileInView={{ opacity: 1, x: 0, y: 0 }}
				viewport={{ once, margin: "-50px" }}
				transition={transition}
			>
				{children}
			</m.div>
		);
	}

	return (
		<m.div
			className={className}
			initial={getInitial()}
			animate={{ opacity: 1, x: 0, y: 0 }}
			transition={transition}
		>
			{children}
		</m.div>
	);
}
