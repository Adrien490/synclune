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
	/**
	 * Vélocité minimum en px/ms pour déclencher le swipe (défaut: 0.5)
	 * Un swipe rapide avec une courte distance déclenchera quand même le callback
	 */
	velocityThreshold?: number;
	/**
	 * Distance minimum en px pour qu'un swipe rapide soit valide (défaut: 20)
	 * Évite les déclenchements accidentels sur des micro-mouvements
	 */
	minDistanceForVelocity?: number;
	/** Désactive le swipe (utile pour les reduced motion) */
	disabled?: boolean;
}

/**
 * Hook pour détecter les gestes de swipe sur mobile (horizontal ou vertical)
 * Retourne les handlers touch à attacher au container
 *
 * Détecte les swipes basés sur :
 * 1. La distance parcourue (threshold)
 * 2. La vélocité du geste (velocityThreshold) - un swipe rapide se déclenche même si court
 *
 * @example
 * // Swipe horizontal (fermeture d'un drawer latéral)
 * const swipeHandlers = useSwipeGesture({ onSwipe: close, direction: "right" })
 *
 * // Swipe vertical (fermeture d'un bottom sheet)
 * const swipeHandlers = useSwipeGesture({ onSwipe: close, direction: "down" })
 *
 * // Swipe avec vélocité personnalisée
 * const swipeHandlers = useSwipeGesture({
 *   onSwipe: close,
 *   direction: "down",
 *   threshold: 100,
 *   velocityThreshold: 0.8, // Plus stricte
 * })
 *
 * <div {...swipeHandlers}>...</div>
 */
export function useSwipeGesture({
	onSwipe,
	direction = "right",
	threshold = 80,
	velocityThreshold = 0.5,
	minDistanceForVelocity = 20,
	disabled = false,
}: UseSwipeGestureOptions) {
	const startX = useRef(0);
	const startY = useRef(0);
	const currentX = useRef(0);
	const currentY = useRef(0);
	const startTime = useRef(0);

	const isHorizontal = direction === "left" || direction === "right";

	const onTouchStart = (e: TouchEvent) => {
		if (disabled) return;
		startX.current = e.touches[0].clientX;
		startY.current = e.touches[0].clientY;
		currentX.current = startX.current;
		currentY.current = startY.current;
		startTime.current = Date.now();
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
		// Math.max(1, ...) évite une division par zéro si le touch est très rapide
		const duration = Math.max(1, Date.now() - startTime.current);

		let shouldTrigger = false;

		if (isHorizontal) {
			// Pour les swipes horizontaux, vérifier que le mouvement est principalement horizontal
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				const distance = direction === "right" ? deltaX : -deltaX;
				const velocity = Math.abs(deltaX) / duration;

				// Déclencher si :
				// 1. La distance dépasse le seuil OU
				// 2. La vélocité dépasse le seuil ET la distance minimum est atteinte
				shouldTrigger =
					distance > threshold ||
					(velocity > velocityThreshold && distance > minDistanceForVelocity);
			}
		} else {
			// Pour les swipes verticaux, vérifier que le mouvement est principalement vertical
			if (Math.abs(deltaY) > Math.abs(deltaX)) {
				const distance = direction === "down" ? deltaY : -deltaY;
				const velocity = Math.abs(deltaY) / duration;

				// Déclencher si :
				// 1. La distance dépasse le seuil OU
				// 2. La vélocité dépasse le seuil ET la distance minimum est atteinte
				shouldTrigger =
					distance > threshold ||
					(velocity > velocityThreshold && distance > minDistanceForVelocity);
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
		startTime.current = 0;
	};

	// Gère l'interruption du touch (notification, appel, sortie de zone)
	const onTouchCancel = () => {
		startX.current = 0;
		startY.current = 0;
		currentX.current = 0;
		currentY.current = 0;
		startTime.current = 0;
	};

	return {
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		onTouchCancel,
	};
}
