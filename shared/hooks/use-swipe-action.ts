"use client";

import { useState, useEffect, useRef, useEffectEvent } from "react";
import { triggerHaptic } from "./use-haptic";

/** Default swipe distance (px) to trigger an action */
const SWIPE_ACTION_THRESHOLD = 80;

/** Ratio of card width used as alternative threshold (whichever is lower) */
const SWIPE_WIDTH_RATIO = 0.3;

/** Ratio of card width beyond which overswipe auto-triggers the action */
const OVERSWIPE_RATIO = 0.75;

/** Maximum vertical movement (px) before horizontal tracking is cancelled */
const SWIPE_VERTICAL_CANCEL_THRESHOLD = 30;

/** Minimum horizontal movement (px) before locking swipe direction */
const SWIPE_DIRECTION_LOCK_DISTANCE = 5;

interface SwipeActionConfig {
	/** Called when the swipe meets or exceeds the threshold */
	onAction: () => void;
	/** Minimum swipe distance to trigger (px, default 80) */
	threshold?: number;
}

interface UseSwipeActionOptions {
	/** Ref to the element that should detect swipe gestures */
	elementRef: React.RefObject<HTMLElement | null>;
	/** Whether swipe detection is active (default: true) */
	enabled?: boolean;
	/** Action revealed when swiping left (card slides ←) */
	leftAction?: SwipeActionConfig;
	/** Action revealed when swiping right (card slides →) */
	rightAction?: SwipeActionConfig;
}

interface UseSwipeActionReturn {
	/** Current horizontal offset in px. Negative = swiping left, positive = swiping right. 0 at rest. */
	swipeOffset: number;
	/** Whether the user is actively touching/swiping */
	isSwiping: boolean;
	/** 0–1 progress toward the left action threshold */
	leftProgress: number;
	/** 0–1 progress toward the right action threshold */
	rightProgress: number;
}

/**
 * Computes the effective threshold: min(configuredPx, containerWidth * 30%).
 * Falls back to the px threshold if the container width is unavailable.
 */
function getEffectiveThreshold(pxThreshold: number, containerWidth: number): number {
	if (containerWidth <= 0) return pxThreshold;
	return Math.min(pxThreshold, containerWidth * SWIPE_WIDTH_RATIO);
}

/**
 * Detects bidirectional horizontal swipe gestures on a touch element.
 *
 * - Tracks left (←) and/or right (→) swipe independently
 * - Locks direction after the first intentional horizontal move
 * - Cancels if vertical movement dominates (scroll protection)
 * - Dynamic threshold: min(configured px, 30% of card width)
 * - Overswipe auto-trigger at >75% of card width
 * - Fires actions when the swipe exceeds the threshold on release
 * - Passive touch listeners (non-blocking scroll performance)
 *
 * @example
 * ```tsx
 * const { swipeOffset, isSwiping, leftProgress } = useSwipeAction({
 *   elementRef,
 *   leftAction: { onAction: handleDelete, threshold: 80 },
 * });
 * ```
 */
export function useSwipeAction({
	elementRef,
	enabled = true,
	leftAction,
	rightAction,
}: UseSwipeActionOptions): UseSwipeActionReturn {
	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isSwiping, setIsSwiping] = useState(false);
	const [containerWidth, setContainerWidth] = useState(0);

	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const isTrackingRef = useRef(false);
	const lockedDirectionRef = useRef<"left" | "right" | null>(null);
	const swipeOffsetRef = useRef(0);
	const overswipeFiredRef = useRef(false);
	const rafIdRef = useRef(0);

	// Stable event callbacks — avoids stale closure + no dependency needed in effect
	const onLeftAction = useEffectEvent(() => {
		triggerHaptic("medium");
		leftAction?.onAction();
	});
	const onRightAction = useEffectEvent(() => {
		triggerHaptic("medium");
		rightAction?.onAction();
	});

	const hasLeft = !!leftAction;
	const hasRight = !!rightAction;
	const leftThresholdPx = leftAction?.threshold ?? SWIPE_ACTION_THRESHOLD;
	const rightThresholdPx = rightAction?.threshold ?? SWIPE_ACTION_THRESHOLD;
	const containerWidthRef = useRef(0);

	useEffect(() => {
		const el = elementRef.current;
		if (!el || !enabled || (!hasLeft && !hasRight)) return;

		function onTouchStart(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touch) return;
			touchStartRef.current = { x: touch.clientX, y: touch.clientY };
			isTrackingRef.current = true;
			lockedDirectionRef.current = null;
			overswipeFiredRef.current = false;
			setIsSwiping(true);
		}

		function onTouchMove(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touchStartRef.current || !touch || !isTrackingRef.current) return;

			const deltaX = touch.clientX - touchStartRef.current.x;
			const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

			// Cancel if vertical movement dominates (user is scrolling)
			if (deltaY > SWIPE_VERTICAL_CANCEL_THRESHOLD) {
				isTrackingRef.current = false;
				lockedDirectionRef.current = null;
				cancelAnimationFrame(rafIdRef.current);
				setSwipeOffset(0);
				return;
			}

			// Lock swipe direction after the first intentional horizontal move
			if (lockedDirectionRef.current === null && Math.abs(deltaX) > SWIPE_DIRECTION_LOCK_DISTANCE) {
				if (deltaX < 0 && hasLeft) {
					lockedDirectionRef.current = "left";
				} else if (deltaX > 0 && hasRight) {
					lockedDirectionRef.current = "right";
				} else {
					isTrackingRef.current = false;
					return;
				}
			}

			// Compute new offset
			let newOffset = 0;
			if (lockedDirectionRef.current === "left") {
				newOffset = Math.min(0, deltaX);
			} else if (lockedDirectionRef.current === "right") {
				newOffset = Math.max(0, deltaX);
			}

			// Read container width once per move for progress + overswipe
			const measuredWidth = el?.getBoundingClientRect().width ?? 0;
			if (measuredWidth !== containerWidthRef.current) {
				containerWidthRef.current = measuredWidth;
				setContainerWidth(measuredWidth);
			}

			// Update via rAF for 60fps
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = requestAnimationFrame(() => {
				swipeOffsetRef.current = newOffset;
				setSwipeOffset(newOffset);
			});

			// Overswipe auto-trigger at >75% of card width
			if (!overswipeFiredRef.current) {
				if (measuredWidth > 0 && Math.abs(newOffset) > measuredWidth * OVERSWIPE_RATIO) {
					overswipeFiredRef.current = true;
					if (lockedDirectionRef.current === "left") {
						onLeftAction();
					} else if (lockedDirectionRef.current === "right") {
						onRightAction();
					}
				}
			}
		}

		function onTouchEnd() {
			if (!touchStartRef.current) return;
			touchStartRef.current = null;
			setIsSwiping(false);
			cancelAnimationFrame(rafIdRef.current);

			if (isTrackingRef.current && !overswipeFiredRef.current) {
				const offset = swipeOffsetRef.current;
				const dir = lockedDirectionRef.current;
				const containerWidth = el?.getBoundingClientRect().width ?? 0;

				if (dir === "left") {
					const threshold = getEffectiveThreshold(leftThresholdPx, containerWidth);
					if (Math.abs(offset) >= threshold) {
						onLeftAction();
					}
				} else if (dir === "right") {
					const threshold = getEffectiveThreshold(rightThresholdPx, containerWidth);
					if (offset >= threshold) {
						onRightAction();
					}
				}
			}

			isTrackingRef.current = false;
			lockedDirectionRef.current = null;
			overswipeFiredRef.current = false;
			setSwipeOffset(0);
		}

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: true });
		el.addEventListener("touchend", onTouchEnd, { passive: true });
		el.addEventListener("touchcancel", onTouchEnd, { passive: true });

		return () => {
			cancelAnimationFrame(rafIdRef.current);
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
			el.removeEventListener("touchcancel", onTouchEnd);
		};
	}, [elementRef, enabled, hasLeft, hasRight, leftThresholdPx, rightThresholdPx]);

	const effectiveLeftThreshold = getEffectiveThreshold(leftThresholdPx, containerWidth);
	const effectiveRightThreshold = getEffectiveThreshold(rightThresholdPx, containerWidth);
	const leftProgress =
		swipeOffset < 0 ? Math.min(1, Math.abs(swipeOffset) / effectiveLeftThreshold) : 0;
	const rightProgress = swipeOffset > 0 ? Math.min(1, swipeOffset / effectiveRightThreshold) : 0;

	return { swipeOffset, isSwiping, leftProgress, rightProgress };
}

export { SWIPE_ACTION_THRESHOLD, SWIPE_WIDTH_RATIO, OVERSWIPE_RATIO };
