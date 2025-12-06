"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

	// Ref pour throttle avec requestAnimationFrame
	const rafIdRef = useRef<number | null>(null);

	// Cleanup RAF au démontage
	useEffect(() => {
		return () => {
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, []);

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

			// Prévenir le scroll de la page si le swipe horizontal est significatif
			// Seuil de 10px pour distinguer swipe intentionnel du scroll vertical
			if (Math.abs(offset) > 10) {
				e.preventDefault();
			}

			// Résistance élastique aux bords (premier/dernier)
			const isAtStart = currentIndex === 0;
			const isAtEnd = currentIndex === totalImages - 1;

			// Si on est au début et on swipe vers la droite, ou à la fin et vers la gauche
			// Appliquer une résistance (diviser le mouvement par 3)
			if ((isAtStart && offset > 0) || (isAtEnd && offset < 0)) {
				offset = offset / 3;
			}

			// Mettre à jour la ref immédiatement (pour onTouchEnd)
			swipeOffsetRef.current = offset;

			// Throttle le re-render avec requestAnimationFrame
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current);
			}
			rafIdRef.current = requestAnimationFrame(() => {
				setSwipeOffset(offset);
				rafIdRef.current = null;
			});
		},
		[currentIndex, totalImages]
	);

	const onTouchEnd = useCallback(() => {
		// Annuler tout RAF en attente pour éviter state inconsistant
		if (rafIdRef.current) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}

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
