"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollHideBottomBarOptions {
	/**
	 * Minimum distance (px) scrolled before the hidden state can flip.
	 * @default 8
	 */
	threshold?: number;
	/**
	 * Minimum scroll velocity (px per ms) required to hide on down-scroll.
	 * Prevents hiding on slow/rubber-band scrolls.
	 * @default 0.3
	 */
	velocityThreshold?: number;
	/**
	 * While the viewport is within this many pixels of the top of the page,
	 * the bar is forced visible. @default 64
	 */
	hideAtTopOffset?: number;
	/**
	 * Element to observe. If omitted, observes `window`.
	 * Pass a ref for an internal scroll container.
	 */
	target?: React.RefObject<HTMLElement | null>;
}

/**
 * Returns `true` when the bottom bar should slide out (fast down-scroll),
 * `false` when it should remain visible (up-scroll, idle, or near the top).
 *
 * Opt-in helper for {@link BottomBar}'s `isHidden` prop — no consumer uses it
 * automatically. Throttles via `requestAnimationFrame` and is SSR-safe.
 */
export function useScrollHideBottomBar({
	threshold = 8,
	velocityThreshold = 0.3,
	hideAtTopOffset = 64,
	target,
}: UseScrollHideBottomBarOptions = {}): boolean {
	const [isHidden, setIsHidden] = useState(false);
	const lastYRef = useRef(0);
	const lastTimeRef = useRef(0);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const getScrollY = () => (target?.current ? target.current.scrollTop : window.scrollY);

		lastYRef.current = getScrollY();
		lastTimeRef.current = performance.now();

		const onScroll = () => {
			if (rafRef.current !== null) return;

			rafRef.current = requestAnimationFrame(() => {
				rafRef.current = null;

				const now = performance.now();
				const currentY = getScrollY();
				const dy = currentY - lastYRef.current;
				const dt = Math.max(now - lastTimeRef.current, 1);
				const velocity = dy / dt;

				if (Math.abs(dy) < threshold) return;

				if (currentY <= hideAtTopOffset) {
					setIsHidden(false);
				} else if (dy > 0 && velocity > velocityThreshold) {
					setIsHidden(true);
				} else if (dy < 0) {
					setIsHidden(false);
				}

				lastYRef.current = currentY;
				lastTimeRef.current = now;
			});
		};

		const scrollTarget: Window | HTMLElement = target?.current ?? window;
		scrollTarget.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			scrollTarget.removeEventListener("scroll", onScroll);
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [threshold, velocityThreshold, hideAtTopOffset, target]);

	return isHidden;
}
