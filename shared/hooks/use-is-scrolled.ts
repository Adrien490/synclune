"use client";

import { useEffect, useState, useEffectEvent } from "react";

/**
 * Hook optimisé pour détecter le scroll
 *
 * Utilise requestAnimationFrame au lieu de throttle custom pour :
 * - Meilleure performance (synchronisé avec le refresh du navigateur)
 * - Pas de memory leaks avec setTimeout
 * - Optimisation GPU automatique
 *
 * @param threshold - Seuil de scroll en pixels (défaut: 10)
 * @returns true si scrollY > threshold
 */
export function useIsScrolled(threshold: number = 10): boolean {
	const [isScrolled, setIsScrolled] = useState(false);

	// Effect Event pour accéder à threshold sans re-registration du listener
	const updateScrollState = useEffectEvent(() => {
		const scrolled = window.scrollY > threshold;
		setIsScrolled(scrolled);
	});

	useEffect(() => {
		// Flag pour éviter les appels multiples de RAF
		let ticking = false;

		const handleScroll = () => {
			if (!ticking) {
				// requestAnimationFrame garantit 60fps max et sync avec le navigateur
				window.requestAnimationFrame(() => {
					updateScrollState();
					ticking = false;
				});
				ticking = true;
			}
		};

		// Initial check (synchrone pour éviter flash)
		setIsScrolled(window.scrollY > threshold);

		// Listener passif pour ne pas bloquer le scroll
		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, [threshold, updateScrollState]);

	return isScrolled;
}
