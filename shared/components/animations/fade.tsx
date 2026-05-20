import type { CSSProperties } from "react";

import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "./motion.config";
import type { FadeProps } from "./types";

const FADE_EASE = `cubic-bezier(${MOTION_CONFIG.easing.easeInOut.join(",")})`;

/**
 * Fade — opacity + vertical-offset entrance animation.
 *
 * Universal component (no "use client"): renders a plain `<div>` driven by
 * the CSS `entrance-fade` keyframe. Zero motion-react, zero hydration cost —
 * the animation runs on the compositor thread.
 *
 * @param delay - Delay before the animation, in seconds (load mode only)
 * @param duration - Animation duration, in seconds
 * @param y - Vertical offset in pixels the content travels from
 * @param inView - Scroll-triggered (`animation-timeline: view()`) when true,
 *   otherwise runs on mount. Browsers without `view()` (Safari <= 18) and
 *   reduced-motion users see the content fully — no FOUC.
 *
 * `once` and `disableOnTouch` are accepted for API compatibility but are
 * no-ops: a CSS animation runs once by nature and carries no JS cost.
 */
export function Fade({
	children,
	className,
	delay = 0,
	duration = MOTION_CONFIG.duration.normal,
	y = MOTION_CONFIG.transform.fadeY,
	inView = false,
}: FadeProps) {
	return (
		<div
			className={cn(inView ? "enter-inview" : "enter-load", className)}
			style={
				{
					"--enter-y": `${y}px`,
					"--enter-duration": `${Math.round(duration * 1000)}ms`,
					"--enter-delay": `${Math.round(delay * 1000)}ms`,
					"--enter-ease": FADE_EASE,
				} as CSSProperties
			}
		>
			{children}
		</div>
	);
}
