import type { TouchEvent } from "react";
import { useRef } from "react";

interface UseSwipeGestureOptions {
	/** Callback appelé quand le swipe dépasse le seuil */
	onSwipe: () => void;
	/** Direction du swipe à détecter */
	direction?: "right" | "left";
	/** Distance minimum en px pour déclencher le swipe (défaut: 80) */
	threshold?: number;
}

/**
 * Hook pour détecter les gestes de swipe horizontal sur mobile
 * Retourne les handlers touch à attacher au container
 *
 * @example
 * const swipeHandlers = useSwipeGesture({ onSwipe: close, direction: "right" })
 * <div {...swipeHandlers}>...</div>
 */
export function useSwipeGesture({
	onSwipe,
	direction = "right",
	threshold = 80,
}: UseSwipeGestureOptions) {
	const startX = useRef(0);
	const currentX = useRef(0);

	const onTouchStart = (e: TouchEvent) => {
		startX.current = e.touches[0].clientX;
		currentX.current = startX.current;
	};

	const onTouchMove = (e: TouchEvent) => {
		currentX.current = e.touches[0].clientX;
	};

	const onTouchEnd = () => {
		const deltaX = currentX.current - startX.current;

		const shouldTrigger =
			direction === "right" ? deltaX > threshold : deltaX < -threshold;

		if (shouldTrigger) {
			onSwipe();
		}

		startX.current = 0;
		currentX.current = 0;
	};

	return {
		onTouchStart,
		onTouchMove,
		onTouchEnd,
	};
}
