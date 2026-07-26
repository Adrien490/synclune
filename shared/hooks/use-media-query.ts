"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook to detect CSS media queries (responsive design)
 *
 * Uses useSyncExternalStore for consistent behavior
 * (aligned with useIsMobile / useIsTouchDevice pattern)
 *
 * ⚠️ Les seuils de **largeur** se dérivent de `shared/constants/breakpoints.ts`
 * (`mediaBelow` / `mediaAtLeast` / `mediaBetween`), jamais d'un littéral en px :
 * un seuil px se désynchronise des breakpoints Tailwind (rem) dès que la police
 * racine change. Verrouillé par `no-px-media-query.regression.test.ts`.
 * Les requêtes sans largeur (`prefers-reduced-motion`, `hover`, `orientation`…)
 * se passent en clair.
 *
 * @param query - CSS media query
 * @returns true if the media query matches, false otherwise
 *
 * @example
 * const isDesktop = useMediaQuery(mediaAtLeast("sm"));
 * return isDesktop ? <DesktopComponent /> : <MobileComponent />;
 */
export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(callback) => {
			const mediaQuery = window.matchMedia(query);
			mediaQuery.addEventListener("change", callback);
			return () => mediaQuery.removeEventListener("change", callback);
		},
		() => window.matchMedia(query).matches,
		() => false,
	);
}
