"use client";

import { useState, useEffect } from "react";

/**
 * Hook pour détecter si l'utilisateur préfère réduire les animations
 * Respecte l'accessibilité WCAG 2.3.3
 */
export function useReducedMotion(): boolean {
	const [prefersReduced, setPrefersReduced] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setPrefersReduced(mediaQuery.matches);

		const handleChange = (e: MediaQueryListEvent) => {
			setPrefersReduced(e.matches);
		};

		// Support Safari < 14
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", handleChange);
			return () => mediaQuery.removeEventListener("change", handleChange);
		} else {
			mediaQuery.addListener(handleChange);
			return () => mediaQuery.removeListener(handleChange);
		}
	}, []);

	return prefersReduced;
}
