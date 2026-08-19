"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/shared/utils/cn";
import { announce } from "@/shared/utils/announce";
import { applyRubberBand } from "@/shared/utils/rubber-band";
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

/** Minimum release velocity (px/ms) for a flick to commit below the distance threshold. */
const FLICK_VELOCITY_THRESHOLD = 0.5;

/** Minimum travelled distance (px) for a flick commit — immunises tap micro-drags. */
const FLICK_MIN_DISTANCE = 24;

/** Sliding window (ms) of touch samples retained to measure the release velocity. */
const VELOCITY_SAMPLE_WINDOW_MS = 100;

/**
 * Icon scale while the swipe is committed (release will fire) — the iOS Mail
 * "pop". This is the VISUAL half of the commit cue: the haptic half is a silent
 * no-op on iOS Safari (no Vibration API), so without it an iPhone user has no
 * way to tell whether releasing will fire.
 */
const COMMITTED_ICON_SCALE = 1.2;

/** Zone saturation while committed — a discrete step above the progressive ramp (max 1.2). */
const COMMITTED_ZONE_SATURATION = 1.35;

/**
 * Progress below which the threshold haptic re-arms (hysteresis). Retreating
 * under the commit zone then re-crossing must re-tick — but a finger resting ON
 * the threshold must not buzz, hence 0.85 and not 1.
 */
const THRESHOLD_HAPTIC_REARM_PROGRESS = 0.85;

interface SwipeActionSlot {
	/** Icon or label rendered inside the action zone */
	children: React.ReactNode;
	/** Text announced via `announce()` when the action fires (screen-reader feedback, required) */
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
	/**
	 * One-shot discoverability nudge: on mount, the card briefly auto-reveals its
	 * action zone then snaps back, teaching the swipe gesture (iOS Mail / Reminders
	 * style). Silent demo — fires no haptic and triggers no action. Skipped under
	 * `prefers-reduced-motion`. Drive this from `useGestureHintOnce` so it plays once
	 * per device. @default false
	 */
	peek?: boolean;
	className?: string;
}

/** Shared easing for the elastic snap-back — spring-like overshoot (~MOTION_CONFIG.spring.list). */
const SNAP_BACK_EASE = "cubic-bezier(0.25, 1.2, 0.5, 1)";

// Card snap-back transition. Note the `s` unit: MOTION_CONFIG.duration values are
// expressed in seconds (normal = 0.2 = 200ms).
const SNAP_BACK_TRANSITION = `transform ${MOTION_CONFIG.duration.normal}s ${SNAP_BACK_EASE}`;

// Action-zone snap-back — width + opacity retract in lockstep with the card so the
// colored zone never desynchronises from the card edge during the return animation.
const ZONE_SNAP_TRANSITION =
	`width ${MOTION_CONFIG.duration.normal}s ${SNAP_BACK_EASE}, ` +
	`opacity ${MOTION_CONFIG.duration.normal}s ${SNAP_BACK_EASE}`;

/** Saturation-filter transition for the action zone — independent of the snap-back. */
const ZONE_FILTER_TRANSITION = "filter 150ms ease-out";

/** Fraction of the action threshold revealed during the one-shot peek nudge. */
const PEEK_OFFSET_RATIO = 0.55;

/**
 * Minimum zone opacity while the peek plays. The zone opacity normally follows
 * the swipe progress, so at 55% of the threshold the hint sat at 55% opacity —
 * too washed out to teach anything.
 */
const PEEK_ZONE_MIN_OPACITY = 0.9;

/** Delay (ms) before the peek opens — lets list entrance animations settle first. */
const PEEK_DELAY_MS = 700;

/** Duration (ms) the peek stays open before snapping back. */
const PEEK_HOLD_MS = 650;

/**
 * Computes the effective threshold: min(configuredPx, containerWidth * 30%),
 * floored at 1px — a consumer-provided `threshold: 0` would otherwise divide
 * the progress by zero (progress = offset / threshold).
 * Falls back to the px threshold if the container width is unavailable.
 */
function getEffectiveThreshold(pxThreshold: number, containerWidth: number): number {
	if (containerWidth <= 0) return Math.max(1, pxThreshold);
	return Math.max(1, Math.min(pxThreshold, containerWidth * SWIPE_WIDTH_RATIO));
}

interface VelocitySample {
	x: number;
	t: number;
}

/**
 * Signed horizontal release velocity (px/ms) over the retained sample window.
 * Returns 0 with fewer than 2 samples or a degenerate elapsed time.
 */
function computeReleaseVelocity(samples: readonly VelocitySample[]): number {
	const first = samples[0];
	const last = samples[samples.length - 1];
	if (!first || !last || first === last) return 0;
	const elapsed = last.t - first.t;
	if (elapsed <= 0) return 0;
	return (last.x - first.x) / elapsed;
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
 * - Action zone width tracks the card edge, filling the revealed area (no background gap)
 * - Overswipe past 75% of card width commits the action — runs on release, `heavy` haptic
 * - Flick commit: a fast release (≥ 0.5 px/ms over ≥ 24 px) fires below the distance threshold
 * - Discrete committed state past the threshold: `data-committed` on the zone, icon pop
 *   (scale 1.2) + saturation step — the visual "release to confirm" cue (the haptic one
 *   is a silent no-op on iOS Safari)
 * - iOS-style rubber-band elasticity past the threshold (logarithmic compression)
 * - Scale + rotate icon reveal synchronized with swipe progress (iOS Mail style)
 * - Progressive color saturation of the action zone (feedback intensifies)
 * - Single `medium` haptic tick when the swipe crosses the action threshold (re-armed
 *   with hysteresis when retreating below); `heavy` on overswipe; `medium` on flick commit
 * - Screen-reader announcement of the action label on confirm (WCAG 2.2), via the
 *   global live regions of `AppToaster` (`announce()`) — they survive the card
 *   unmounting, which is the nominal case for a remove action
 * - Elastic snap-back with spring-like timing
 * - Respects `prefers-reduced-motion`
 * - Passive touch listeners for scroll-safe performance
 *
 * **Accessibility**: The reveal zones are decorative (`aria-hidden`). Each swipe action
 * must also have a visible keyboard-accessible equivalent (button) somewhere in the card
 * content — swipe alone is not sufficient per WCAG 2.2 Level AA Success Criterion 2.5.7
 * (Dragging Movements).
 *
 * **Opt-out**: Children can mark any subtree with `data-no-swipe` to skip gesture
 * tracking when the touch starts inside it — useful for interactive controls
 * (quantity steppers, action buttons) where an accidental micro-drag during a tap
 * should never trigger the swipe-to-action flow.
 */
export function SwipeableCard({
	children,
	leftAction,
	rightAction,
	enabled = true,
	peek = false,
	className,
}: SwipeableCardProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();
	const haptic = useHaptic();
	const thresholdHapticFiredRef = useRef(false);

	// Announce for screen readers, then run the consumer action. The announcement
	// goes through the GLOBAL live regions mounted by `AppToaster` (`announce()`)
	// and NOT a live region owned by this card: a remove action unmounts the card
	// in the same React commit as the announcement text, which was therefore
	// never read — and a region must pre-exist in the a11y tree to be voiced.
	function fireAction(onAction: () => void, label: string) {
		announce(label);
		onAction();
	}

	// Inlined swipe-action state
	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isSwiping, setIsSwiping] = useState(false);
	const [isPeeking, setIsPeeking] = useState(false);
	const [containerWidth, setContainerWidth] = useState(0);

	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const isTrackingRef = useRef(false);
	const lockedDirectionRef = useRef<"left" | "right" | null>(null);
	const swipeOffsetRef = useRef(0);
	const overswipeFiredRef = useRef(false);
	const velocitySamplesRef = useRef<VelocitySample[]>([]);
	const rafIdRef = useRef(0);
	const containerWidthRef = useRef(0);

	const hasLeft = !!leftAction;
	const hasRight = !!rightAction;
	const leftThresholdPx = leftAction?.threshold ?? SWIPE_ACTION_THRESHOLD;
	const rightThresholdPx = rightAction?.threshold ?? SWIPE_ACTION_THRESHOLD;

	// Stable action callbacks — announce + run. Haptics are fired separately
	// (medium tick on threshold cross or flick commit, heavy on overswipe) to keep
	// one source of truth.
	const onLeftAction = useEffectEvent(() => {
		if (leftAction) fireAction(leftAction.onAction, leftAction.label);
	});
	const onRightAction = useEffectEvent(() => {
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
			const target = e.target as Element | null;
			if (target?.closest("[data-no-swipe]")) return;
			touchStartRef.current = { x: touch.clientX, y: touch.clientY };
			isTrackingRef.current = true;
			lockedDirectionRef.current = null;
			overswipeFiredRef.current = false;
			velocitySamplesRef.current = [{ x: touch.clientX, t: performance.now() }];
			// The user grabbed the card — the peek (open or pending) no longer owns
			// the offset, and its opacity floor must not apply to the real gesture.
			setIsPeeking(false);
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
				swipeOffsetRef.current = 0;
				// Release `isSwiping` too: the return to 0 must ANIMATE — leaving it
				// true kept `transition: none` and the card (plus its colored zone)
				// jumped back instead of snapping back.
				setIsSwiping(false);
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
				// Set at direction lock, not at touchstart: a plain tap (or a vertical
				// scroll grab) must not toggle state and re-render the wrapper.
				setIsSwiping(true);
			}

			let newOffset = 0;
			if (lockedDirectionRef.current === "left") {
				newOffset = Math.min(0, deltaX);
			} else if (lockedDirectionRef.current === "right") {
				newOffset = Math.max(0, deltaX);
			}

			const now = performance.now();
			const samples = velocitySamplesRef.current;
			samples.push({ x: touch.clientX, t: now });
			while (samples.length > 1 && samples[0] && now - samples[0].t > VELOCITY_SAMPLE_WINDOW_MS) {
				samples.shift();
			}

			const measuredWidth = containerWidthRef.current;

			// The ref is written SYNCHRONOUSLY: touchend cancels the pending frame,
			// so a ref written inside the rAF decided on the SECOND-TO-LAST move —
			// a fast swipe ending just past the threshold didn't fire. Only the
			// setState (render concern) is deferred to the frame.
			swipeOffsetRef.current = newOffset;
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = requestAnimationFrame(() => {
				setSwipeOffset(newOffset);
			});

			// Overswipe past 75%: commit the action and fire the `heavy` haptic now,
			// but defer running it to touchend so a modal never opens under the finger.
			if (!overswipeFiredRef.current) {
				if (measuredWidth > 0 && Math.abs(newOffset) > measuredWidth * OVERSWIPE_RATIO) {
					overswipeFiredRef.current = true;
					triggerHaptic("heavy");
				}
			}
		}

		function onTouchEnd() {
			if (!touchStartRef.current) return;
			touchStartRef.current = null;
			setIsSwiping(false);
			cancelAnimationFrame(rafIdRef.current);

			const dir = lockedDirectionRef.current;
			if (isTrackingRef.current && dir) {
				const runAction = dir === "left" ? onLeftAction : onRightAction;

				if (overswipeFiredRef.current) {
					// Overswipe committed during the drag — run the action now the finger is up.
					runAction();
				} else {
					const offset = swipeOffsetRef.current;
					const width = containerWidthRef.current;
					const thresholdPx = dir === "left" ? leftThresholdPx : rightThresholdPx;
					const threshold = getEffectiveThreshold(thresholdPx, width);

					if (Math.abs(offset) >= threshold) {
						runAction();
					} else {
						// Flick commit: a fast short swipe confirms below the distance
						// threshold (iOS Mail). The distance floor immunises tap
						// micro-drags; the threshold haptic never fired down here, so
						// tick the confirm now (cooldown in use-haptic dedupes anyway).
						const velocity = computeReleaseVelocity(velocitySamplesRef.current);
						const isFlick =
							Math.abs(offset) >= FLICK_MIN_DISTANCE &&
							(dir === "left"
								? velocity <= -FLICK_VELOCITY_THRESHOLD
								: velocity >= FLICK_VELOCITY_THRESHOLD);
						if (isFlick) {
							triggerHaptic("medium");
							runAction();
						}
					}
				}
			}

			isTrackingRef.current = false;
			lockedDirectionRef.current = null;
			overswipeFiredRef.current = false;
			velocitySamplesRef.current = [];
			swipeOffsetRef.current = 0;
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
			// `enabled` can flip mid-gesture (viewport class change, list refresh):
			// without this reset the card stayed frozen at its current offset with
			// no listener left to ever bring it back.
			touchStartRef.current = null;
			isTrackingRef.current = false;
			lockedDirectionRef.current = null;
			overswipeFiredRef.current = false;
			velocitySamplesRef.current = [];
			swipeOffsetRef.current = 0;
			setIsSwiping(false);
			setSwipeOffset(0);
		};
	}, [enabled, hasLeft, hasRight, leftThresholdPx, rightThresholdPx]);

	const effectiveLeftThreshold = getEffectiveThreshold(leftThresholdPx, containerWidth);
	const effectiveRightThreshold = getEffectiveThreshold(rightThresholdPx, containerWidth);
	const leftProgress =
		swipeOffset < 0 ? Math.min(1, Math.abs(swipeOffset) / effectiveLeftThreshold) : 0;
	const rightProgress = swipeOffset > 0 ? Math.min(1, swipeOffset / effectiveRightThreshold) : 0;

	// Committed = releasing now fires the action. Drives the discrete visual cue
	// (`data-committed`, icon pop, saturation step) — see COMMITTED_ICON_SCALE.
	const isLeftCommitted = leftProgress >= 1;
	const isRightCommitted = rightProgress >= 1;

	// Single `medium` haptic tick the moment the swipe crosses the action threshold
	// (the iOS-style "release to confirm" cue). Re-armed with hysteresis when the
	// finger retreats below THRESHOLD_HAPTIC_REARM_PROGRESS, so re-crossing re-ticks.
	useEffect(() => {
		if (!isSwiping) {
			thresholdHapticFiredRef.current = false;
			return;
		}
		const progress = Math.max(leftProgress, rightProgress);
		if (progress >= 1 && !thresholdHapticFiredRef.current) {
			thresholdHapticFiredRef.current = true;
			haptic("medium");
		} else if (progress < THRESHOLD_HAPTIC_REARM_PROGRESS && thresholdHapticFiredRef.current) {
			thresholdHapticFiredRef.current = false;
		}
	}, [isSwiping, leftProgress, rightProgress, haptic]);

	// One-shot "peek" nudge: briefly auto-reveal the action zone then snap back, to
	// teach the swipe gesture on first visit. Silent demo — no haptic, no action fires.
	// Reuses the existing offset/snap-back machinery (CSS transition runs when not
	// actively swiping, and the colored zones already track `swipeOffset`).
	//
	// ⚠️ La magnitude est lue AU MOMENT DU TIR, via une effect event. Les seuils
	// effectifs dérivent de `containerWidth`, que le `ResizeObserver` ci-dessus met à
	// jour — les lister en dépendances relançait les DEUX timers à chaque
	// redimensionnement (montage compris, où la largeur passe de 0 à sa mesure) : la
	// fermeture programmée était annulée et la carte restait ouverte un cycle de plus
	// avant de se rouvrir. Bonus : la magnitude n'est plus figée sur un
	// `containerWidth` encore à 0. @regression swipe-peek-survives-resize
	const onPeekOpen = useEffectEvent(() => {
		// Skip if the user already grabbed the card — never hijack a real gesture.
		if (isTrackingRef.current) return;
		// Prefer the right action (card slides →); fall back to the left action (←).
		const magnitude =
			(hasRight ? effectiveRightThreshold : effectiveLeftThreshold) * PEEK_OFFSET_RATIO;
		setIsPeeking(true);
		setSwipeOffset(hasRight ? magnitude : -magnitude);
	});

	useEffect(() => {
		if (!peek || !enabled || prefersReducedMotion) return;
		if (!hasLeft && !hasRight) return;

		const open = setTimeout(onPeekOpen, PEEK_DELAY_MS);

		const close = setTimeout(() => {
			if (isTrackingRef.current) return;
			setIsPeeking(false);
			setSwipeOffset(0);
		}, PEEK_DELAY_MS + PEEK_HOLD_MS);

		return () => {
			clearTimeout(open);
			clearTimeout(close);
		};
	}, [peek, enabled, prefersReducedMotion, hasLeft, hasRight]);

	// Apply iOS-style rubber-band compression past the active-direction threshold.
	const activeThreshold =
		swipeOffset < 0 ? effectiveLeftThreshold : swipeOffset > 0 ? effectiveRightThreshold : 0;
	const displayOffset = prefersReducedMotion
		? swipeOffset
		: applyRubberBand(swipeOffset, containerWidth, activeThreshold);

	const snapTransition = prefersReducedMotion || isSwiping ? "none" : SNAP_BACK_TRANSITION;

	// Action zone width tracks the card edge so the colored zone fills the entire
	// revealed area — no list-background gap once the swipe exceeds a fixed width.
	const leftZoneWidth = displayOffset < 0 ? -displayOffset : 0;
	const rightZoneWidth = displayOffset > 0 ? displayOffset : 0;

	// While dragging: width/opacity follow the finger instantly (filter still eases).
	// On release: width/opacity share the snap-back so the zone retracts with the card.
	const zoneTransition = prefersReducedMotion
		? "none"
		: isSwiping
			? ZONE_FILTER_TRANSITION
			: `${ZONE_SNAP_TRANSITION}, ${ZONE_FILTER_TRANSITION}`;

	// Peek floor: during the hint, the zone opacity is floored so the teaching
	// reveal reads clearly instead of replaying the washed-out 55% of the ramp.
	const zoneOpacity = (progress: number) =>
		isPeeking && progress > 0 ? Math.max(PEEK_ZONE_MIN_OPACITY, progress) : progress;

	return (
		// overflow-x-clip (pas overflow-hidden) : seul l'axe horizontal du swipe doit
		// clipper — la ProductCard polaroid de /favoris déborde verticalement par
		// construction (lift hover, glow), et `clip` ne crée pas de scroll container
		// donc l'axe vertical reste réellement `visible`.
		<div ref={containerRef} className={cn("relative touch-pan-y overflow-x-clip", className)}>
			{/* Right-side action (revealed on swipe right →) — decorative reveal zone */}
			{rightAction && (
				<div
					aria-hidden="true"
					data-swipe-action="right"
					data-committed={isRightCommitted ? "" : undefined}
					className={cn(
						"absolute inset-y-0 left-0 flex items-center justify-start overflow-hidden pl-5",
						rightAction.className ?? "bg-secondary",
					)}
					style={{
						width: rightZoneWidth,
						opacity: zoneOpacity(rightProgress),
						filter: `saturate(${isRightCommitted ? COMMITTED_ZONE_SATURATION : 0.7 + rightProgress * 0.5})`,
						transition: zoneTransition,
						["--swipe-progress" as string]: rightProgress,
					}}
				>
					<span
						className="shrink-0 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
						style={{
							transform: prefersReducedMotion
								? undefined
								: isRightCommitted
									? `scale(${COMMITTED_ICON_SCALE}) rotate(0deg)`
									: "scale(calc(0.6 + var(--swipe-progress, 0) * 0.4)) rotate(calc((1 - var(--swipe-progress, 0)) * -8deg))",
							transformOrigin: "center",
						}}
					>
						{rightAction.children}
					</span>
				</div>
			)}

			{/* Left-side action (revealed on swipe left ←) — decorative reveal zone */}
			{leftAction && (
				<div
					aria-hidden="true"
					data-swipe-action="left"
					data-committed={isLeftCommitted ? "" : undefined}
					className={cn(
						"absolute inset-y-0 right-0 flex items-center justify-end overflow-hidden pr-5",
						leftAction.className ?? "bg-destructive",
					)}
					style={{
						width: leftZoneWidth,
						opacity: zoneOpacity(leftProgress),
						filter: `saturate(${isLeftCommitted ? COMMITTED_ZONE_SATURATION : 0.7 + leftProgress * 0.5})`,
						transition: zoneTransition,
						["--swipe-progress" as string]: leftProgress,
					}}
				>
					<span
						className="shrink-0 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
						style={{
							transform: prefersReducedMotion
								? undefined
								: isLeftCommitted
									? `scale(${COMMITTED_ICON_SCALE}) rotate(0deg)`
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
					willChange: isSwiping ? "transform" : undefined,
				}}
			>
				{children}
			</div>
		</div>
	);
}
