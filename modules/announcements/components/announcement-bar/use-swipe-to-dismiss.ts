"use client";

import { useState, useEffect, useRef } from "react";
import { SWIPE_DISMISS_THRESHOLD } from "./announcement-bar.constants";

interface UseSwipeToDismissOptions {
	/** Ref to the element that should be swipeable */
	elementRef: React.RefObject<HTMLElement | null>;
	/** Whether swipe detection is active */
	enabled: boolean;
	/** Called when swipe exceeds threshold */
	onDismiss: () => void;
}

interface UseSwipeToDismissReturn {
	/** Current swipe offset in px (negative = swiping up). 0 when not swiping. */
	swipeOffset: number;
}

/**
 * Detects upward swipe gestures on a touch element and triggers dismiss.
 *
 * - Only tracks upward movement (offset clamped to <= 0)
 * - Snaps back if swipe doesn't exceed threshold
 * - Passive touch listeners (non-blocking scroll)
 */
export function useSwipeToDismiss({
	elementRef,
	enabled,
	onDismiss,
}: UseSwipeToDismissOptions): UseSwipeToDismissReturn {
	const [swipeOffset, setSwipeOffset] = useState(0);
	const touchStartYRef = useRef<number | null>(null);
	const swipeOffsetRef = useRef(0);
	const onDismissRef = useRef(onDismiss);

	// Sync refs in effects to comply with React 19 lint rules
	useEffect(() => {
		swipeOffsetRef.current = swipeOffset;
	}, [swipeOffset]);

	useEffect(() => {
		onDismissRef.current = onDismiss;
	}, [onDismiss]);

	useEffect(() => {
		const el = elementRef.current;
		if (!el || !enabled) return;

		function onTouchStart(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touch) return;
			touchStartYRef.current = touch.clientY;
		}

		function onTouchMove(e: TouchEvent) {
			const touch = e.touches[0];
			if (touchStartYRef.current === null || !touch) return;
			const deltaY = touch.clientY - touchStartYRef.current;
			// Only track upward swipes (negative delta), clamp to 0
			setSwipeOffset(Math.min(0, deltaY));
		}

		function onTouchEnd() {
			if (touchStartYRef.current === null) return;
			touchStartYRef.current = null;

			if (swipeOffsetRef.current < -SWIPE_DISMISS_THRESHOLD) {
				onDismissRef.current();
			}
			setSwipeOffset(0);
		}

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: true });
		el.addEventListener("touchend", onTouchEnd, { passive: true });

		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
		};
	}, [elementRef, enabled]);

	return { swipeOffset };
}
