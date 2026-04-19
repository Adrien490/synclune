"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { triggerHaptic, useHaptic } from "@/shared/hooks/use-haptic";

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

interface SwipeActionSlot {
	/** Icon or label rendered inside the action zone */
	children: React.ReactNode;
	/** Screen-reader label for the action zone (required for a11y) */
	label: string;
	/** Tailwind background class (default: "bg-destructive" for left, "bg-secondary" for right) */
	className?: string;
	/** Minimum swipe distance to fire the action (px, default 80) */
	threshold?: number;
	/** Called when the swipe threshold is met on release */
	onAction: () => void;
}

interface SwipeableCardProps {
	children: React.ReactNode;
	/**
	 * Action revealed when the card is swiped left (card slides ←, action appears on the right).
	 * Typically a destructive action (delete, remove).
	 */
	leftAction?: SwipeActionSlot;
	/**
	 * Action revealed when the card is swiped right (card slides →, action appears on the left).
	 * Typically a secondary action (archive, mark as read).
	 */
	rightAction?: SwipeActionSlot;
	/** Whether swipe gestures are active (default: true) */
	enabled?: boolean;
	className?: string;
}

// CSS spring() equivalent of MOTION_CONFIG.spring.list
const SNAP_BACK_TRANSITION = `transform ${MOTION_CONFIG.duration.normal}ms cubic-bezier(0.25, 1.2, 0.5, 1)`;

/** Duration (ms) an aria-live announcement remains in the DOM after firing. */
const ANNOUNCEMENT_DURATION_MS = 1500;

/** Rubber-band compression factor — fraction of container width controlling the log curve stiffness. */
const RUBBER_BAND_K_RATIO = 0.3;

/** Upper bound of the rubber-band compressed offset, as a fraction of container width. */
const RUBBER_BAND_MAX_RATIO = 0.85;

/**
 * Compresses a linear swipe offset beyond `threshold` using a logarithmic curve,
 * reproducing the iOS rubber-band resistance felt when dragging list items past
 * their action zone.
 *
 * - Below threshold: identity (free movement).
 * - Above threshold: `threshold + log1p(over / k) * k`, where `k = width * 0.3`.
 * - Asymptote: `width * 0.85` — the card never fully spans the viewport.
 *
 * Safe with `width === 0` (returns identity), which lets the mock environment
 * in unit tests remain simple.
 */
export function applyRubberBand(offset: number, width: number, threshold: number): number {
	if (width <= 0) return offset;
	const sign = Math.sign(offset);
	const absOffset = Math.abs(offset);
	if (absOffset <= threshold) return offset;
	const k = Math.max(width * RUBBER_BAND_K_RATIO, 1);
	const over = absOffset - threshold;
	const compressed = threshold + Math.log1p(over / k) * k;
	const cap = width * RUBBER_BAND_MAX_RATIO;
	return sign * Math.min(compressed, cap);
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
 * Generic swipeable card wrapper for mobile list items.
 *
 * Reveals action zones behind the card on horizontal swipe:
 * - Left swipe (←): reveals `leftAction` on the right side (e.g. delete)
 * - Right swipe (→): reveals `rightAction` on the left side (e.g. archive)
 *
 * Features:
 * - Dynamic threshold: min(configured px, 30% of card width)
 * - Overswipe auto-trigger at >75% of card width (fires `heavy` haptic tier)
 * - iOS-style rubber-band elasticity past the threshold (logarithmic compression)
 * - Scale + rotate icon reveal synchronized with swipe progress (iOS Mail style)
 * - Progressive color saturation of the action zone (feedback intensifies)
 * - Haptic tiers: `light` at 40% hint, `medium` on confirm, `heavy` on overswipe
 * - `aria-live="polite"` announcement of the action label on confirm (WCAG 2.2)
 * - Elastic snap-back with spring-like timing
 * - Respects `prefers-reduced-motion`
 * - Passive touch listeners for scroll-safe performance
 *
 * **Accessibility**: Each swipe action must also have a visible keyboard-accessible
 * equivalent (button) somewhere in the card content — swipe alone is not sufficient
 * per WCAG 2.2 Level AA Success Criterion 2.5.7 (Dragging Movements).
 */
export function SwipeableCard({
	children,
	leftAction,
	rightAction,
	enabled = true,
	className,
}: SwipeableCardProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();
	const haptic = useHaptic();
	const hintFiredRef = useRef(false);
	const confirmFiredRef = useRef(false);
	const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [announcement, setAnnouncement] = useState("");

	// Hook-side effective callbacks (wrap each action with confirm guard + SR announcement).
	function fireAction(onAction: () => void, label: string) {
		if (!confirmFiredRef.current) {
			confirmFiredRef.current = true;
		}
		if (announcementTimerRef.current) {
			clearTimeout(announcementTimerRef.current);
		}
		setAnnouncement(label);
		announcementTimerRef.current = setTimeout(() => {
			setAnnouncement("");
			announcementTimerRef.current = null;
		}, ANNOUNCEMENT_DURATION_MS);
		onAction();
	}

	// Inlined swipe-action state
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

	const hasLeft = !!leftAction;
	const hasRight = !!rightAction;
	const leftThresholdPx = leftAction?.threshold ?? SWIPE_ACTION_THRESHOLD;
	const rightThresholdPx = rightAction?.threshold ?? SWIPE_ACTION_THRESHOLD;

	// Stable event callbacks — tier controls which haptic pattern fires.
	// Source of truth for action haptics (no duplication from callers).
	const onLeftAction = useEffectEvent((tier: "confirm" | "overswipe" = "confirm") => {
		triggerHaptic(tier === "overswipe" ? "heavy" : "medium");
		if (leftAction) fireAction(leftAction.onAction, leftAction.label);
	});
	const onRightAction = useEffectEvent((tier: "confirm" | "overswipe" = "confirm") => {
		triggerHaptic(tier === "overswipe" ? "heavy" : "medium");
		if (rightAction) fireAction(rightAction.onAction, rightAction.label);
	});

	// Track container width via ResizeObserver — no per-move getBoundingClientRect.
	useEffect(() => {
		const el = containerRef.current;
		if (!el || !enabled || (!hasLeft && !hasRight)) return;

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
	}, [enabled, hasLeft, hasRight]);

	useEffect(() => {
		const el = containerRef.current;
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

			if (deltaY > SWIPE_VERTICAL_CANCEL_THRESHOLD) {
				isTrackingRef.current = false;
				lockedDirectionRef.current = null;
				cancelAnimationFrame(rafIdRef.current);
				setSwipeOffset(0);
				return;
			}

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

			let newOffset = 0;
			if (lockedDirectionRef.current === "left") {
				newOffset = Math.min(0, deltaX);
			} else if (lockedDirectionRef.current === "right") {
				newOffset = Math.max(0, deltaX);
			}

			const measuredWidth = containerWidthRef.current;

			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = requestAnimationFrame(() => {
				swipeOffsetRef.current = newOffset;
				setSwipeOffset(newOffset);
			});

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
	}, [enabled, hasLeft, hasRight, leftThresholdPx, rightThresholdPx]);

	const effectiveLeftThreshold = getEffectiveThreshold(leftThresholdPx, containerWidth);
	const effectiveRightThreshold = getEffectiveThreshold(rightThresholdPx, containerWidth);
	const leftProgress =
		swipeOffset < 0 ? Math.min(1, Math.abs(swipeOffset) / effectiveLeftThreshold) : 0;
	const rightProgress = swipeOffset > 0 ? Math.min(1, swipeOffset / effectiveRightThreshold) : 0;

	useEffect(() => {
		const progress = Math.max(leftProgress, rightProgress);
		if (!isSwiping) {
			hintFiredRef.current = false;
			confirmFiredRef.current = false;
			return;
		}
		if (progress >= 0.4 && !hintFiredRef.current) {
			hintFiredRef.current = true;
			haptic("light");
		}
	}, [isSwiping, leftProgress, rightProgress, haptic]);

	useEffect(() => {
		return () => {
			if (announcementTimerRef.current) {
				clearTimeout(announcementTimerRef.current);
			}
		};
	}, []);

	// Apply iOS-style rubber-band compression past the active-direction threshold.
	const activeThreshold =
		swipeOffset < 0 ? effectiveLeftThreshold : swipeOffset > 0 ? effectiveRightThreshold : 0;
	const displayOffset = prefersReducedMotion
		? swipeOffset
		: applyRubberBand(swipeOffset, containerWidth, activeThreshold);

	const snapTransition = prefersReducedMotion || isSwiping ? "none" : SNAP_BACK_TRANSITION;

	return (
		<div ref={containerRef} className={cn("relative touch-pan-y overflow-hidden", className)}>
			{/* Screen-reader announcement of the last fired action (WCAG 2.2 SC 2.5.7 complement) */}
			<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</span>

			{/* Right-side action (revealed on swipe right →) */}
			{rightAction && (
				<div
					className={cn(
						"absolute inset-y-0 left-0 flex w-20 items-center justify-start pl-5",
						"motion-safe:transition-[filter] motion-safe:duration-150",
						rightAction.className ?? "bg-secondary",
					)}
					role="button"
					tabIndex={-1}
					aria-label={rightAction.label}
					style={{
						opacity: rightProgress,
						filter: `saturate(${0.7 + rightProgress * 0.5})`,
						["--swipe-progress" as string]: rightProgress,
					}}
				>
					<span
						className="motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
						style={{
							transform: prefersReducedMotion
								? undefined
								: "scale(calc(0.6 + var(--swipe-progress, 0) * 0.4)) rotate(calc((1 - var(--swipe-progress, 0)) * -8deg))",
							transformOrigin: "center",
						}}
					>
						{rightAction.children}
					</span>
				</div>
			)}

			{/* Left-side action (revealed on swipe left ←) */}
			{leftAction && (
				<div
					className={cn(
						"absolute inset-y-0 right-0 flex w-20 items-center justify-end pr-5",
						"motion-safe:transition-[filter] motion-safe:duration-150",
						leftAction.className ?? "bg-destructive",
					)}
					role="button"
					tabIndex={-1}
					aria-label={leftAction.label}
					style={{
						opacity: leftProgress,
						filter: `saturate(${0.7 + leftProgress * 0.5})`,
						["--swipe-progress" as string]: leftProgress,
					}}
				>
					<span
						className="motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
						style={{
							transform: prefersReducedMotion
								? undefined
								: "scale(calc(0.6 + var(--swipe-progress, 0) * 0.4)) rotate(calc((1 - var(--swipe-progress, 0)) * 8deg))",
							transformOrigin: "center",
						}}
					>
						{leftAction.children}
					</span>
				</div>
			)}

			{/* Sliding card content */}
			<div
				style={{
					transform: `translateX(${displayOffset}px)`,
					transition: snapTransition,
				}}
			>
				{children}
			</div>
		</div>
	);
}
