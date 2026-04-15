"use client";

import { useRef, useState } from "react";

/** Duration (ms) a touch must be held before long press fires */
const LONG_PRESS_DELAY = 500;

/** Maximum px movement allowed before the gesture is cancelled */
const LONG_PRESS_MOVE_TOLERANCE = 10;

interface UseLongPressOptions {
	/** Called after the delay if the touch hasn't moved or been cancelled */
	onLongPress: () => void;
	/** Hold duration before firing (ms, default 500) */
	delay?: number;
	/** Max movement in px before cancelling (default 10) */
	moveTolerance?: number;
}

interface UseLongPressReturn {
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchMove: (e: React.TouchEvent) => void;
	onTouchEnd: () => void;
	onTouchCancel: () => void;
	onClick: (e: React.MouseEvent) => void;
	/** true during the hold delay — use for scale/bg press feedback */
	isPressing: boolean;
}

/**
 * Detects long-press gestures on touch elements.
 *
 * - Cancels if the finger moves beyond `moveTolerance` (scroll protection)
 * - Suppresses the subsequent click event after a long press fires
 * - Returns React event handler props to spread onto the target element
 *
 * @example
 * ```tsx
 * const longPress = useLongPress({ onLongPress: openContextMenu });
 *
 * <div
 *   {...longPress}
 *   className={cn("transition-transform duration-150", longPress.isPressing && "scale-[1.02]")}
 * >
 *   {children}
 * </div>
 * ```
 */
export function useLongPress({
	onLongPress,
	delay = LONG_PRESS_DELAY,
	moveTolerance = LONG_PRESS_MOVE_TOLERANCE,
}: UseLongPressOptions): UseLongPressReturn {
	const [isPressing, setIsPressing] = useState(false);

	const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
	const startPosRef = useRef<{ x: number; y: number } | null>(null);
	const didLongPressRef = useRef(false);
	const onLongPressRef = useRef(onLongPress);

	// Keep ref in sync with the latest callback without triggering re-renders
	onLongPressRef.current = onLongPress; // eslint-disable-line react-hooks/refs -- intentional ref write during render to keep callback in sync (standard React pattern)

	function clear() {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
		setIsPressing(false);
	}

	function handleTouchStart(e: React.TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;

		startPosRef.current = { x: touch.clientX, y: touch.clientY };
		didLongPressRef.current = false;
		setIsPressing(true);

		timerRef.current = setTimeout(() => {
			didLongPressRef.current = true;
			setIsPressing(false);
			onLongPressRef.current();
		}, delay);
	}

	function handleTouchMove(e: React.TouchEvent) {
		if (!startPosRef.current || !timerRef.current) return;

		const touch = e.touches[0];
		if (!touch) return;

		const dx = Math.abs(touch.clientX - startPosRef.current.x);
		const dy = Math.abs(touch.clientY - startPosRef.current.y);

		// Cancel if the finger has moved too far (user is scrolling)
		if (dx > moveTolerance || dy > moveTolerance) {
			clear();
		}
	}

	function handleTouchEnd() {
		clear();
	}

	function handleClick(e: React.MouseEvent) {
		// Suppress the click that fires immediately after a long press
		if (didLongPressRef.current) {
			e.preventDefault();
			e.stopPropagation();
			didLongPressRef.current = false;
		}
	}

	return {
		onTouchStart: handleTouchStart,
		onTouchMove: handleTouchMove,
		onTouchEnd: handleTouchEnd,
		onTouchCancel: handleTouchEnd,
		onClick: handleClick,
		isPressing,
	};
}

export { LONG_PRESS_DELAY, LONG_PRESS_MOVE_TOLERANCE };
