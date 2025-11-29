"use client";

import { useCallback, useRef, useState } from "react";

interface UseGallerySwipeOptions {
	onSwipeLeft: () => void;
	onSwipeRight: () => void;
	minSwipeDistance?: number;
	/** Nombre total d'images pour la résistance aux bords */
	totalImages?: number;
	/** Index actuel pour la résistance aux bords */
	currentIndex?: number;
}

export interface UseGallerySwipeReturn {
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchMove: (e: React.TouchEvent) => void;
	onTouchEnd: () => void;
	/** Décalage visuel en pixels pendant le swipe */
	swipeOffset: number;
	/** Indique si un swipe est en cours */
	isSwiping: boolean;
}

/**
 * Hook pour gérer la navigation par swipe sur mobile
 * - Détection du swipe gauche/droite
 * - Distance minimale configurable
 * - Feedback visuel pendant le drag (swipeOffset)
 * - Résistance élastique aux bords
 */
export function useGallerySwipe({
	onSwipeLeft,
	onSwipeRight,
	minSwipeDistance = 50,
	totalImages = 1,
	currentIndex = 0,
}: UseGallerySwipeOptions): UseGallerySwipeReturn {
	const touchStartRef = useRef<number | null>(null);
	// Ref pour éviter stale closure dans onTouchEnd
	const swipeOffsetRef = useRef(0);
	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isSwiping, setIsSwiping] = useState(false);

	const onTouchStart = useCallback((e: React.TouchEvent) => {
		// Guard: vérifier que le touch existe (multi-touch protection)
		const touch = e.targetTouches[0];
		if (!touch) return;

		touchStartRef.current = touch.clientX;
		setIsSwiping(true);
	}, []);

	const onTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (touchStartRef.current === null) return;

			// Guard: vérifier que le touch existe
			const touch = e.targetTouches[0];
			if (!touch) return;

			const currentX = touch.clientX;
			let offset = currentX - touchStartRef.current;

			// Résistance élastique aux bords (premier/dernier)
			const isAtStart = currentIndex === 0;
			const isAtEnd = currentIndex === totalImages - 1;

			// Si on est au début et on swipe vers la droite, ou à la fin et vers la gauche
			// Appliquer une résistance (diviser le mouvement par 3)
			if ((isAtStart && offset > 0) || (isAtEnd && offset < 0)) {
				offset = offset / 3;
			}

			// Mettre à jour ref ET state
			swipeOffsetRef.current = offset;
			setSwipeOffset(offset);
		},
		[currentIndex, totalImages]
	);

	const onTouchEnd = useCallback(() => {
		if (touchStartRef.current === null) {
			setIsSwiping(false);
			setSwipeOffset(0);
			swipeOffsetRef.current = 0;
			return;
		}

		// Utiliser ref pour éviter stale closure
		const distance = -swipeOffsetRef.current;
		const isLeftSwipe = distance > minSwipeDistance;
		const isRightSwipe = distance < -minSwipeDistance;

		if (isLeftSwipe) {
			onSwipeLeft();
		} else if (isRightSwipe) {
			onSwipeRight();
		}

		// Reset
		touchStartRef.current = null;
		swipeOffsetRef.current = 0;
		setSwipeOffset(0);
		setIsSwiping(false);
	}, [minSwipeDistance, onSwipeLeft, onSwipeRight]);

	return {
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		swipeOffset,
		isSwiping,
	};
}
