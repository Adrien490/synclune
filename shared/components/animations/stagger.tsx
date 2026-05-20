import { Children, isValidElement, type CSSProperties, type Key, type ReactNode } from "react";

import { MOTION_CONFIG } from "./motion.config";
import type { StaggerProps } from "./types";

const STAGGER_EASE = `cubic-bezier(${MOTION_CONFIG.easing.easeOut.join(",")})`;

// Scroll-driven (inView) stagger: each child's animation-range start is shifted
// by STEP per index, capped so `entry <start>% cover 32%` stays a valid range.
const STAGGER_RANGE_STEP_PCT = 5;
const STAGGER_RANGE_MAX_PCT = 25;

/** Stable key from the child, falling back to the index. */
function getStableKey(child: ReactNode, index: number): Key {
	if (isValidElement(child) && child.key != null) {
		return child.key;
	}
	return index;
}

/**
 * Stagger — cascade entrance: each direct child fades + slides in with a
 * growing offset.
 *
 * Universal component (no "use client"): the container is a plain `<div>` and
 * each child is wrapped in a `<div>` driven by the CSS `entrance-fade`
 * keyframe. Zero motion-react.
 *
 * - `inView=false` (default): runs on mount, cascade via `animation-delay`.
 * - `inView=true`: scroll-triggered (`animation-timeline: view()`), cascade
 *   via a per-child `animation-range` start offset.
 *
 * `once`, `amount` and `disableOnTouch` are accepted for API compatibility
 * but are no-ops. Any `data-*` attribute is forwarded to the container.
 */
export function Stagger({
	children,
	className,
	stagger = MOTION_CONFIG.stagger.normal,
	delay = 0,
	duration = MOTION_CONFIG.duration.normal,
	y = 20,
	inView = false,
	once: _once,
	amount: _amount,
	role,
	disableOnTouch: _disableOnTouch,
	...rest
}: StaggerProps) {
	const childrenArray = Children.toArray(children);
	const itemClass = inView ? "enter-inview" : "enter-load";

	return (
		<div className={className} role={role} {...rest}>
			{childrenArray.map((child, index) => (
				<div
					key={getStableKey(child, index)}
					className={itemClass}
					style={
						{
							"--enter-y": `${y}px`,
							"--enter-duration": `${Math.round(duration * 1000)}ms`,
							"--enter-ease": STAGGER_EASE,
							// Load mode — per-child delay cascade.
							"--enter-delay": `${Math.round((delay + index * stagger) * 1000)}ms`,
							// Scroll mode — per-child animation-range start offset.
							"--enter-stagger": `${Math.min(
								index * STAGGER_RANGE_STEP_PCT,
								STAGGER_RANGE_MAX_PCT,
							)}%`,
						} as CSSProperties
					}
				>
					{child}
				</div>
			))}
		</div>
	);
}
