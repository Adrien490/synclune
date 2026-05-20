import type { CSSProperties } from "react";

import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "./motion.config";
import type { RevealProps } from "./types";

const REVEAL_EASE = `cubic-bezier(${MOTION_CONFIG.easing.easeOut.join(",")})`;

/**
 * Reveal — scroll-triggered entrance (always `whileInView` semantics).
 *
 * Universal component (no "use client"): a plain `<div>` driven by the CSS
 * `entrance-fade` keyframe bound to `animation-timeline: view()`. Zero
 * motion-react. Browsers without `view()` (Safari <= 18) and reduced-motion
 * users see the content fully — no FOUC.
 *
 * `delay`, `once`, `amount` and `disableOnTouch` are accepted for API
 * compatibility but are no-ops for the CSS scroll-driven reveal. Any `data-*`
 * attribute is forwarded to the wrapper.
 */
export function Reveal({
	children,
	className,
	delay: _delay = 0,
	duration = MOTION_CONFIG.duration.normal,
	y = MOTION_CONFIG.transform.fadeY,
	once: _once,
	amount: _amount,
	role,
	disableOnTouch: _disableOnTouch,
	...rest
}: RevealProps) {
	return (
		<div
			className={cn("enter-inview", className)}
			role={role}
			style={
				{
					"--enter-y": `${y}px`,
					"--enter-duration": `${Math.round(duration * 1000)}ms`,
					"--enter-ease": REVEAL_EASE,
				} as CSSProperties
			}
			{...rest}
		>
			{children}
		</div>
	);
}
