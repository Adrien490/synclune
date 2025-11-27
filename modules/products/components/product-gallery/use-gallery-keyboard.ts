"use client";

import { useEffect, type RefObject } from "react";

interface UseGalleryKeyboardOptions {
	galleryRef: RefObject<HTMLElement | null>;
	currentIndex: number;
	totalImages: number;
	onNavigate: (newIndex: number) => void;
	enabled?: boolean;
}

/**
 * Hook pour gérer la navigation clavier dans la galerie
 * - Flèches gauche/droite : navigation
 * - Home : première image
 * - End : dernière image
 * - Actif uniquement quand la galerie est focusée
 */
export function useGalleryKeyboard({
	galleryRef,
	currentIndex,
	totalImages,
	onNavigate,
	enabled = true,
}: UseGalleryKeyboardOptions): void {
	useEffect(() => {
		if (!enabled || totalImages === 0) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			switch (event.key) {
				case "ArrowLeft":
					event.preventDefault();
					onNavigate(currentIndex === 0 ? totalImages - 1 : currentIndex - 1);
					break;
				case "ArrowRight":
					event.preventDefault();
					onNavigate(currentIndex === totalImages - 1 ? 0 : currentIndex + 1);
					break;
				case "Home":
					event.preventDefault();
					onNavigate(0);
					break;
				case "End":
					event.preventDefault();
					onNavigate(totalImages - 1);
					break;
			}
		};

		const galleryElement = galleryRef.current;
		if (galleryElement) {
			galleryElement.addEventListener("keydown", handleKeyDown);
			return () => {
				galleryElement.removeEventListener("keydown", handleKeyDown);
			};
		}
	}, [enabled, currentIndex, totalImages, onNavigate, galleryRef]);
}
