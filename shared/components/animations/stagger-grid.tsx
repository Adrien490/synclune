import { isValidElement, type CSSProperties, type Key, type ReactNode } from "react";

import { MOTION_CONFIG } from "./motion.config";

export interface StaggerGridProps extends React.AriaAttributes {
	children: ReactNode;
	className?: string;
	/** Stagger delay between items (default: 0.06) */
	stagger?: number;
	/** Initial delay before first item (default: 0) */
	delay?: number;
	/** Y offset for entrance animation (default: 20) */
	y?: number;
	/**
	 * Scale factor for entrance (default: 0.95).
	 * Mobile: passer 1 si grille volumineuse pour épargner GPU (composited layer).
	 */
	scale?: number;
	/** Enable scroll-triggered animation (default: true) */
	inView?: boolean;
	/** Accepté pour compat API — no-op (une animation CSS ne joue qu'une fois). */
	once?: boolean;
	/** Accepté pour compat API — no-op (le seuil est géré par animation-range). */
	amount?: number;
	/** HTML role attribute */
	role?: string;
	/** HTML id attribute (used by load-more `aria-controls` for example). */
	id?: string;
	/** Accepté pour compat API — no-op (le CSS n'a aucun coût JS sur tactile). */
	disableOnTouch?: boolean;
	/** Data attributes */
	[key: `data-${string}`]: string | undefined;
}

const GRID_EASE = `cubic-bezier(${MOTION_CONFIG.easing.easeOut.join(",")})`;

// Scroll-driven (inView) stagger: see Stagger — same range-offset cascade.
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
 * StaggerGrid — cascade entrance for grids: each direct child fades + slides +
 * scales in with a growing offset.
 *
 * Universal component (no "use client"): the container is a plain `<div>` and
 * each child is wrapped in a `<div>` driven by the CSS `entrance-fade`
 * keyframe (with `--enter-scale`). Zero motion-react.
 *
 * `once`, `amount` and `disableOnTouch` are accepted for API compatibility
 * but are no-ops. Any `data-*` / `aria-*` attribute is forwarded.
 */
export function StaggerGrid({
	children,
	className,
	stagger = MOTION_CONFIG.stagger.normal,
	delay = 0,
	y = 20,
	scale = 0.95,
	inView = true,
	once: _once,
	amount: _amount,
	role,
	disableOnTouch: _disableOnTouch,
	...rest
}: StaggerGridProps) {
	const childrenArray = Array.isArray(children) ? children : [children];
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
							"--enter-scale": scale,
							"--enter-duration": `${Math.round(MOTION_CONFIG.duration.slow * 1000)}ms`,
							"--enter-ease": GRID_EASE,
							"--enter-delay": `${Math.round((delay + index * stagger) * 1000)}ms`,
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
