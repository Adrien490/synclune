"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Delai minimum entre deux navigations clavier (throttle) - 80ms pour claviers mecaniques */
const KEYBOARD_THROTTLE_MS = 80;

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
 * - Throttle pour éviter navigation trop rapide (touche maintenue)
 */
export function useGalleryKeyboard({
	galleryRef,
	currentIndex,
	totalImages,
	onNavigate,
	enabled = true,
}: UseGalleryKeyboardOptions): void {
	// Refs pour éviter re-registration du listener à chaque navigation
	// Assignation directe dans le render (pas besoin de useEffect)
	const currentIndexRef = useRef(currentIndex);
	const totalImagesRef = useRef(totalImages);
	const onNavigateRef = useRef(onNavigate);
	currentIndexRef.current = currentIndex;
	totalImagesRef.current = totalImages;
	onNavigateRef.current = onNavigate;

	// Ref pour throttle: évite navigation trop rapide quand touche maintenue
	const lastNavigationRef = useRef(0);

	useEffect(() => {
		if (!enabled || totalImages === 0) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			// Ignorer si IME est actif (claviers CJK)
			if (event.isComposing) return;

			const idx = currentIndexRef.current;
			const total = totalImagesRef.current;
			const navigate = onNavigateRef.current;

			// Throttle: ignorer si navigation trop récente (touche maintenue)
			const now = Date.now();
			if (now - lastNavigationRef.current < KEYBOARD_THROTTLE_MS) {
				// Toujours preventDefault pour éviter scroll de la page
				if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
					event.preventDefault();
				}
				return;
			}

			switch (event.key) {
				case "ArrowLeft":
					event.preventDefault();
					lastNavigationRef.current = now;
					navigate(idx === 0 ? total - 1 : idx - 1);
					break;
				case "ArrowRight":
					event.preventDefault();
					lastNavigationRef.current = now;
					navigate(idx === total - 1 ? 0 : idx + 1);
					break;
				case "Home":
					event.preventDefault();
					lastNavigationRef.current = now;
					navigate(0);
					break;
				case "End":
					event.preventDefault();
					lastNavigationRef.current = now;
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
