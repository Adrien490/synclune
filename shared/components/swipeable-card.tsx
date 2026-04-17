"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useSwipeAction, SWIPE_ACTION_THRESHOLD } from "@/shared/hooks/use-swipe-action";

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
 *
 * **Label text** (iOS Mail style): pass a `<span>` alongside the icon via `children`
 * if a visible label under the icon is desired — `children` accepts any `ReactNode`.
 *
 * @example
 * ```tsx
 * <SwipeableCard
 *   leftAction={{
 *     children: <Trash2 className="size-5 text-destructive-foreground" />,
 *     label: `Supprimer ${item.name}`,
 *     className: "bg-destructive",
 *     onAction: handleDelete,
 *   }}
 * >
 *   <div className="flex items-center justify-between">
 *     <div>Card content</div>
 *     {/* Keyboard-accessible equivalent (required for a11y) *​/}
 *     <button aria-label={`Supprimer ${item.name}`} onClick={handleDelete}>
 *       <Trash2 className="size-4" />
 *     </button>
 *   </div>
 * </SwipeableCard>
 * ```
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

	// Hook is the sole source of truth for action haptics (medium/heavy).
	// This wrapper only handles the confirm guard and the screen-reader announcement.
	const wrapOnAction = (onAction: () => void, label: string) => () => {
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
	};

	const {
		swipeOffset,
		isSwiping,
		leftProgress,
		rightProgress,
		containerWidth,
		effectiveLeftThreshold,
		effectiveRightThreshold,
	} = useSwipeAction({
		elementRef: containerRef,
		enabled,
		leftAction: leftAction
			? {
					onAction: wrapOnAction(leftAction.onAction, leftAction.label),
					threshold: leftAction.threshold ?? SWIPE_ACTION_THRESHOLD,
				}
			: undefined,
		rightAction: rightAction
			? {
					onAction: wrapOnAction(rightAction.onAction, rightAction.label),
					threshold: rightAction.threshold ?? SWIPE_ACTION_THRESHOLD,
				}
			: undefined,
	});

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
						// Progressive saturation: 0.7 → 1.2 synchronized with swipe progress
						filter: `saturate(${0.7 + rightProgress * 0.5})`,
						// Exposed as CSS var for the icon wrapper scale/rotate transform
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
