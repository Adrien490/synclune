import type { TouchEvent } from "react";
import { useRef } from "react";

type SwipeDirection = "right" | "left" | "down" | "up";

interface UseSwipeGestureOptions {
	/** Callback appelé quand le swipe dépasse le seuil */
	onSwipe: () => void;
	/** Direction du swipe à détecter */
	direction?: SwipeDirection;
	/** Distance minimum en px pour déclencher le swipe (défaut: 80) */
	threshold?: number;
	/** Désactive le swipe (utile pour les reduced motion) */
	disabled?: boolean;
}

/**
 * Hook pour détecter les gestes de swipe sur mobile (horizontal ou vertical)
 * Retourne les handlers touch à attacher au container
 *
 * @example
 * // Swipe horizontal (fermeture d'un drawer latéral)
 * const swipeHandlers = useSwipeGesture({ onSwipe: close, direction: "right" })
 *
 * // Swipe vertical (fermeture d'un bottom sheet)
 * const swipeHandlers = useSwipeGesture({ onSwipe: close, direction: "down" })
 *
 * <div {...swipeHandlers}>...</div>
 */
export function useSwipeGesture({
	onSwipe,
	direction = "right",
	threshold = 80,
	disabled = false,
}: UseSwipeGestureOptions) {
	const startX = useRef(0);
	const startY = useRef(0);
	const currentX = useRef(0);
	const currentY = useRef(0);

	const isHorizontal = direction === "left" || direction === "right";

	const onTouchStart = (e: TouchEvent) => {
		if (disabled) return;
		startX.current = e.touches[0].clientX;
		startY.current = e.touches[0].clientY;
		currentX.current = startX.current;
		currentY.current = startY.current;
	};

	const onTouchMove = (e: TouchEvent) => {
		if (disabled) return;
		currentX.current = e.touches[0].clientX;
		currentY.current = e.touches[0].clientY;
	};

	const onTouchEnd = () => {
		if (disabled) return;

		const deltaX = currentX.current - startX.current;
		const deltaY = currentY.current - startY.current;

		let shouldTrigger = false;

		if (isHorizontal) {
			// Pour les swipes horizontaux, vérifier que le mouvement est principalement horizontal
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				shouldTrigger =
					direction === "right" ? deltaX > threshold : deltaX < -threshold;
			}
		} else {
			// Pour les swipes verticaux, vérifier que le mouvement est principalement vertical
			if (Math.abs(deltaY) > Math.abs(deltaX)) {
				shouldTrigger =
					direction === "down" ? deltaY > threshold : deltaY < -threshold;
			}
		}

		if (shouldTrigger) {
			onSwipe();
		}

		// Reset
		startX.current = 0;
		startY.current = 0;
		currentX.current = 0;
		currentY.current = 0;
	};

	return {
		onTouchStart,
		onTouchMove,
		onTouchEnd,
	};
}
