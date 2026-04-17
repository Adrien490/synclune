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
	/** Current container width in px (tracked via ResizeObserver). 0 before first measurement. */
	containerWidth: number;
	/** Effective left threshold in px: min(configured, width * 30%). Drives the rubber-band helper. */
	effectiveLeftThreshold: number;
	/** Effective right threshold in px. */
	effectiveRightThreshold: number;
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
 * - Haptic tiers are managed by the hook itself (source of truth):
 *   `medium` on confirm (touchend above threshold), `heavy` on overswipe
 * - Passive touch listeners (non-blocking scroll performance)
 * - Container width tracked via ResizeObserver (no layout thrashing in touchmove)
 *
 * TODO(2026-Q3): evaluate a Pointer Events migration once desktop drag is a
 * requirement. Today all consumers are mobile-only, so Touch Events suffice
 * and avoid a 46-test rewrite.
 *
 * @example
 * ```tsx
 * const { swipeOffset, isSwiping, leftProgress, containerWidth, effectiveLeftThreshold } =
 *   useSwipeAction({
 *     elementRef,
 *     leftAction: { onAction: handleDelete, threshold: 80 },
 *   });
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
	const containerWidthRef = useRef(0);

	// Stable event callbacks — tier controls which haptic pattern fires.
	// Hook is the single source of truth for action haptics (no duplication from callers).
	const onLeftAction = useEffectEvent((tier: "confirm" | "overswipe" = "confirm") => {
		triggerHaptic(tier === "overswipe" ? "heavy" : "medium");
		leftAction?.onAction();
	});
	const onRightAction = useEffectEvent((tier: "confirm" | "overswipe" = "confirm") => {
		triggerHaptic(tier === "overswipe" ? "heavy" : "medium");
		rightAction?.onAction();
	});

	const hasLeft = !!leftAction;
	const hasRight = !!rightAction;
	const leftThresholdPx = leftAction?.threshold ?? SWIPE_ACTION_THRESHOLD;
	const rightThresholdPx = rightAction?.threshold ?? SWIPE_ACTION_THRESHOLD;

	// Track container width via ResizeObserver — no per-move getBoundingClientRect.
	// `elementRef` intentionally omitted from deps: it's a ref, stable by convention.
	useEffect(() => {
		const el = elementRef.current;
		if (!el || !enabled || (!hasLeft && !hasRight)) return;

		// Prime synchronously: we need a width before the first touchmove.
		const initialWidth = el.getBoundingClientRect().width;
		containerWidthRef.current = initialWidth;
		setContainerWidth(initialWidth);

		if (typeof ResizeObserver === "undefined") return;

		const ro = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const width = entry.contentRect.width;
			if (width !== containerWidthRef.current) {
				containerWidthRef.current = width;
				setContainerWidth(width);
			}
		});
		ro.observe(el);

		return () => {
			ro.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, hasLeft, hasRight]);

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

			// Compute new offset (linear — rubber-band is applied at render time in the consumer)
			let newOffset = 0;
			if (lockedDirectionRef.current === "left") {
				newOffset = Math.min(0, deltaX);
			} else if (lockedDirectionRef.current === "right") {
				newOffset = Math.max(0, deltaX);
			}

			// Width is tracked by ResizeObserver — no layout read here.
			const measuredWidth = containerWidthRef.current;

			// Update via rAF for 60fps
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = requestAnimationFrame(() => {
				swipeOffsetRef.current = newOffset;
				setSwipeOffset(newOffset);
			});

			// Overswipe auto-trigger at >75% of card width → "heavy" haptic tier
			if (!overswipeFiredRef.current) {
				if (measuredWidth > 0 && Math.abs(newOffset) > measuredWidth * OVERSWIPE_RATIO) {
					overswipeFiredRef.current = true;
					if (lockedDirectionRef.current === "left") {
						onLeftAction("overswipe");
					} else if (lockedDirectionRef.current === "right") {
						onRightAction("overswipe");
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
				const width = containerWidthRef.current;

				if (dir === "left") {
					const threshold = getEffectiveThreshold(leftThresholdPx, width);
					if (Math.abs(offset) >= threshold) {
						onLeftAction("confirm");
					}
				} else if (dir === "right") {
					const threshold = getEffectiveThreshold(rightThresholdPx, width);
					if (offset >= threshold) {
						onRightAction("confirm");
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

	return {
		swipeOffset,
		isSwiping,
		leftProgress,
		rightProgress,
		containerWidth,
		effectiveLeftThreshold,
		effectiveRightThreshold,
	};
}

export { SWIPE_ACTION_THRESHOLD, SWIPE_WIDTH_RATIO, OVERSWIPE_RATIO };
