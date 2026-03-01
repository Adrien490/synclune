"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook to detect CSS media queries (responsive design)
 *
 * Uses useSyncExternalStore for consistent behavior
 * (aligned with useIsMobile / useIsTouchDevice pattern)
 *
 * @param query - CSS media query (e.g. "(min-width: 640px)")
 * @returns true if the media query matches, false otherwise
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 640px)");
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
