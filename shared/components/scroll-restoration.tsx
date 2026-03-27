"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const STORAGE_PREFIX = "synclune-scroll-";

/**
 * ScrollRestoration - Restores scroll position on back navigation
 *
 * Saves scroll position to sessionStorage before navigation,
 * and restores it when returning to the same page via browser back/forward.
 * Uses Navigation API's navigationType when available, falls back to
 * performance.navigation for older browsers.
 */
export function ScrollRestoration() {
	const pathname = usePathname();

	useEffect(() => {
		const key = `${STORAGE_PREFIX}${pathname}`;

		// Restore scroll position if this is a back/forward navigation
		const nav =
			"navigation" in window
				? (window.navigation as { currentEntry?: { navigationType?: string } })
				: undefined;
		const perfNav =
			"navigation" in performance
				? (performance.navigation as PerformanceNavigation | undefined)
				: undefined;
		const isBackForward =
			// Modern Navigation API
			nav?.currentEntry?.navigationType === "traverse" ||
			// Fallback: performance.navigation (deprecated but widely supported)
			perfNav?.type === perfNav?.TYPE_BACK_FORWARD;

		if (isBackForward) {
			const saved = sessionStorage.getItem(key);
			if (saved) {
				const scrollY = parseInt(saved, 10);
				// Delay to allow streaming content to render
				requestAnimationFrame(() => {
					const prefersReducedMotion = window.matchMedia(
						"(prefers-reduced-motion: reduce)",
					).matches;
					window.scrollTo({
						top: scrollY,
						behavior: prefersReducedMotion ? "instant" : "instant",
					});
				});
			}
		}

		// Save scroll position on beforeunload and on route change
		const saveScroll = () => {
			sessionStorage.setItem(key, String(window.scrollY));
		};

		window.addEventListener("beforeunload", saveScroll);

		return () => {
			// Save on unmount (route change within SPA)
			saveScroll();
			window.removeEventListener("beforeunload", saveScroll);
		};
	}, [pathname]);

	return null;
}
