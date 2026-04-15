"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
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

/**
 * Generic swipeable card wrapper for mobile list items.
 *
 * Reveals action zones behind the card on horizontal swipe:
 * - Left swipe (←): reveals `leftAction` on the right side (e.g. delete)
 * - Right swipe (→): reveals `rightAction` on the left side (e.g. archive)
 *
 * Features:
 * - Dynamic threshold: min(configured px, 30% of card width)
 * - Overswipe auto-trigger at >75% of card width
 * - Elastic snap-back with spring-like timing
 * - Respects `prefers-reduced-motion`
 * - Passive touch listeners for scroll-safe performance
 *
 * **Accessibility**: Each swipe action must also have a visible keyboard-accessible
 * equivalent (button) somewhere in the card content — swipe alone is not sufficient
 * per WCAG 2.1 Level AA.
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

	const { swipeOffset, isSwiping, leftProgress, rightProgress } = useSwipeAction({
		elementRef: containerRef,
		enabled,
		leftAction: leftAction
			? { onAction: leftAction.onAction, threshold: leftAction.threshold ?? SWIPE_ACTION_THRESHOLD }
			: undefined,
		rightAction: rightAction
			? {
					onAction: rightAction.onAction,
					threshold: rightAction.threshold ?? SWIPE_ACTION_THRESHOLD,
				}
			: undefined,
	});

	const snapTransition = prefersReducedMotion || isSwiping ? "none" : SNAP_BACK_TRANSITION;

	return (
		<div ref={containerRef} className={cn("relative touch-pan-y overflow-hidden", className)}>
			{/* Right-side action (revealed on swipe right →) */}
			{rightAction && (
				<div
					className={cn(
						"absolute inset-y-0 left-0 flex w-20 items-center justify-start pl-5",
						rightAction.className ?? "bg-secondary",
					)}
					role="button"
					tabIndex={-1}
					aria-label={rightAction.label}
					style={{ opacity: rightProgress }}
				>
					{rightAction.children}
				</div>
			)}

			{/* Left-side action (revealed on swipe left ←) */}
			{leftAction && (
				<div
					className={cn(
						"absolute inset-y-0 right-0 flex w-20 items-center justify-end pr-5",
						leftAction.className ?? "bg-destructive",
					)}
					role="button"
					tabIndex={-1}
					aria-label={leftAction.label}
					style={{ opacity: leftProgress }}
				>
					{leftAction.children}
				</div>
			)}

			{/* Sliding card content */}
			<div
				style={{
					transform: `translateX(${swipeOffset}px)`,
					transition: snapTransition,
				}}
			>
				{children}
			</div>
		</div>
	);
}
