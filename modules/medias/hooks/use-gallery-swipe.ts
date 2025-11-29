"use client";

import { useCallback, useRef } from "react";

interface UseGallerySwipeOptions {
	onSwipeLeft: () => void;
	onSwipeRight: () => void;
	minSwipeDistance?: number;
}

export interface UseGallerySwipeReturn {
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchMove: (e: React.TouchEvent) => void;
	onTouchEnd: () => void;
}

/**
 * Hook pour gérer la navigation par swipe sur mobile
 * - Détection du swipe gauche/droite
 * - Distance minimale configurable
 * - Utilise des refs pour éviter les re-renders
 */
export function useGallerySwipe({
	onSwipeLeft,
	onSwipeRight,
	minSwipeDistance = 50,
}: UseGallerySwipeOptions): UseGallerySwipeReturn {
	const touchStartRef = useRef<number | null>(null);
	const touchEndRef = useRef<number | null>(null);

	const onTouchStart = useCallback((e: React.TouchEvent) => {
		touchEndRef.current = null;
		touchStartRef.current = e.targetTouches[0].clientX;
	}, []);

	const onTouchMove = useCallback((e: React.TouchEvent) => {
		touchEndRef.current = e.targetTouches[0].clientX;
	}, []);

	const onTouchEnd = useCallback(() => {
		if (!touchStartRef.current || !touchEndRef.current) return;

		const distance = touchStartRef.current - touchEndRef.current;
		const isLeftSwipe = distance > minSwipeDistance;
		const isRightSwipe = distance < -minSwipeDistance;

		if (isLeftSwipe) {
			onSwipeLeft();
		} else if (isRightSwipe) {
			onSwipeRight();
		}

		touchStartRef.current = null;
		touchEndRef.current = null;
	}, [minSwipeDistance, onSwipeLeft, onSwipeRight]);

	return {
		onTouchStart,
		onTouchMove,
		onTouchEnd,
	};
}
