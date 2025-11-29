"use client";

import { useEffect, useRef, type RefObject } from "react";

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
	// Refs pour éviter re-registration du listener à chaque navigation
	const currentIndexRef = useRef(currentIndex);
	const totalImagesRef = useRef(totalImages);
	const onNavigateRef = useRef(onNavigate);

	// Synchroniser les refs avec les props
	useEffect(() => {
		currentIndexRef.current = currentIndex;
	}, [currentIndex]);

	useEffect(() => {
		totalImagesRef.current = totalImages;
	}, [totalImages]);

	useEffect(() => {
		onNavigateRef.current = onNavigate;
	}, [onNavigate]);

	useEffect(() => {
		if (!enabled || totalImages === 0) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			const idx = currentIndexRef.current;
			const total = totalImagesRef.current;
			const navigate = onNavigateRef.current;

			switch (event.key) {
				case "ArrowLeft":
					event.preventDefault();
					navigate(idx === 0 ? total - 1 : idx - 1);
					break;
				case "ArrowRight":
					event.preventDefault();
					navigate(idx === total - 1 ? 0 : idx + 1);
					break;
				case "Home":
					event.preventDefault();
					navigate(0);
					break;
				case "End":
					event.preventDefault();
					navigate(total - 1);
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
	}, [enabled, galleryRef, totalImages]);
}
