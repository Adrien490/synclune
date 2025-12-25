"use client";

import { useState, useEffect } from "react";

/**
 * Hook pour détecter les media queries CSS (responsive design)
 *
 * Avantages vs CSS hidden/block :
 * - Pas de double rendu dans le DOM (économie mémoire)
 * - Pas d'hydration de composants inutiles (React 19)
 * - Bundle splitting possible avec lazy loading
 * - Performance optimale mobile/desktop
 *
 * @param query - Media query CSS (ex: "(min-width: 640px)")
 * @returns true si la media query matche, false sinon
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 640px)");
 * return isDesktop ? <DesktopComponent /> : <MobileComponent />;
 */
export function useMediaQuery(query: string): boolean {
	// État initial : false par défaut pour éviter flash SSR
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		// Protection SSR
		if (typeof window === "undefined") return;

		// Créer la media query list
		const mediaQuery = window.matchMedia(query);

		// Handler de changement
		const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
			setMatches(event.matches);
		};

		// Set initial value
		setMatches(mediaQuery.matches);

		// Écouter les changements (orientation, resize, etc.)
		// Utiliser la nouvelle API addEventListener (Safari 14+)
		// Avec fallback pour anciennes versions
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", handleChange);
		} else {
			// Fallback pour Safari < 14
			mediaQuery.addListener(handleChange);
		}

		return () => {
			if (mediaQuery.removeEventListener) {
				mediaQuery.removeEventListener("change", handleChange);
			} else {
				// Fallback pour Safari < 14
				mediaQuery.removeListener(handleChange);
			}
		};
	}, [query]);

	return matches;
}
