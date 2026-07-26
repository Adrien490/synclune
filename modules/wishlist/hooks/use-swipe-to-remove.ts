"use client";

import { useState, useEffect, useEffectEvent, useRef } from "react";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

/** Minimum horizontal swipe distance (px) to trigger removal on mobile */
const SWIPE_REMOVE_THRESHOLD = 80;

/** Maximum vertical movement (px) before cancelling horizontal swipe */
const VERTICAL_CANCEL_THRESHOLD = 30;

interface UseSwipeToRemoveOptions {
	/** Ref to the swipeable element */
	elementRef: React.RefObject<HTMLElement | null>;
	/** Whether swipe detection is active */
	enabled: boolean;
	/** Called when swipe exceeds threshold */
	onRemove: () => void;
}

interface UseSwipeToRemoveReturn {
	/** Current horizontal swipe offset in px (negative = swiping left). 0 when not swiping. */
	swipeOffset: number;
	/** Whether the user is actively touching/swiping */
	isSwiping: boolean;
}

/**
 * Detects leftward horizontal swipe gestures on a touch element to trigger removal.
 *
 * - Only tracks leftward movement (offset clamped to <= 0)
 * - Cancels if vertical movement dominates (scroll protection)
 * - Snaps back if swipe doesn't exceed threshold
 * - Passive touch listeners (non-blocking scroll)
 */
export function useSwipeToRemove({
	elementRef,
	enabled,
	onRemove,
}: UseSwipeToRemoveOptions): UseSwipeToRemoveReturn {
	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isSwiping, setIsSwiping] = useState(false);
	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const isTrackingRef = useRef(false);
	const swipeOffsetRef = useRef(0);
	const thresholdCrossedRef = useRef(false);
	// `useEffectEvent` plutôt qu'un latest-ref + effet de sync : le callback est
	// recréé à chaque rendu du parent, l'effet `[onRemove]` se réexécutait donc
	// systématiquement pour ne réassigner qu'une ref.
	const emitRemove = useEffectEvent(() => onRemove());

	useEffect(() => {
		swipeOffsetRef.current = swipeOffset;
	}, [swipeOffset]);

	useEffect(() => {
		const el = elementRef.current;
		if (!el || !enabled) return;

		function onTouchStart(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touch) return;
			touchStartRef.current = { x: touch.clientX, y: touch.clientY };
			isTrackingRef.current = true;
			thresholdCrossedRef.current = false;
			setIsSwiping(true);
		}

		function onTouchMove(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touchStartRef.current || !touch) return;

			const deltaX = touch.clientX - touchStartRef.current.x;
			const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

			// Cancel horizontal tracking if vertical movement dominates
			if (deltaY > VERTICAL_CANCEL_THRESHOLD && isTrackingRef.current) {
				isTrackingRef.current = false;
				setSwipeOffset(0);
				return;
			}

			if (!isTrackingRef.current) return;

			// Only track leftward swipes (negative delta), clamp to 0
			const clamped = Math.min(0, deltaX);
			setSwipeOffset(clamped);

			// Fire haptic once when threshold is crossed during swipe
			if (!thresholdCrossedRef.current && clamped < -SWIPE_REMOVE_THRESHOLD) {
				thresholdCrossedRef.current = true;
				triggerHaptic("medium");
			}
		}

		function onTouchEnd() {
			if (touchStartRef.current === null) return;
			touchStartRef.current = null;
			setIsSwiping(false);

			if (isTrackingRef.current && swipeOffsetRef.current < -SWIPE_REMOVE_THRESHOLD) {
				emitRemove();
			}

			isTrackingRef.current = false;
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

	return { swipeOffset, isSwiping };
}

export { SWIPE_REMOVE_THRESHOLD };
