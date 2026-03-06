"use client";

import { useEffect, useState } from "react";

/**
 * Détecte si on a scrollé au-delà d'un seuil via un scroll listener passif.
 *
 * Utilise un scroll listener passif plutôt qu'IntersectionObserver pour garantir
 * un état initial correct même quand threshold > hauteur du viewport.
 *
 * @param threshold - Seuil de scroll en pixels (défaut: 10)
 * @returns true si scrollY > threshold
 */
export function useIsScrolled(threshold: number = 10): boolean {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const check = () => setIsScrolled(window.scrollY > threshold);

		// Sync initial state in case the page was already scrolled before mount
		check();

		window.addEventListener("scroll", check, { passive: true });
		return () => window.removeEventListener("scroll", check);
	}, [threshold]);

	return isScrolled;
}
