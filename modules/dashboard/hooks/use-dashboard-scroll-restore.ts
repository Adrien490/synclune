"use client";

import { useEffect } from "react";

const STORAGE_KEY = "dashboard:scroll-y";

/**
 * Persists the dashboard scroll position across navigations.
 *
 * - On mount: if a position was saved in sessionStorage, scroll to it on the
 *   next animation frame (after streamed content resolves layout).
 * - Before the page is hidden (navigating away or closing the tab), writes the
 *   current scrollY. `visibilitychange` + `pagehide` together cover bfcache,
 *   hard nav, and SPA back-navigation.
 *
 * Storage is scoped per session — opening `/admin` in a new tab starts fresh.
 */
export function useDashboardScrollRestore() {
	useEffect(() => {
		try {
			const saved = window.sessionStorage.getItem(STORAGE_KEY);
			const y = saved ? Number.parseInt(saved, 10) : Number.NaN;
			if (!Number.isNaN(y) && y > 0) {
				requestAnimationFrame(() => {
					window.scrollTo({ top: y, behavior: "auto" });
				});
			}
		} catch {
			// sessionStorage can throw in private-mode Safari — silently ignore.
		}

		const save = () => {
			try {
				window.sessionStorage.setItem(STORAGE_KEY, String(window.scrollY));
			} catch {
				// ignore quota / privacy errors
			}
		};

		const onVisibility = () => {
			if (document.visibilityState === "hidden") save();
		};

		window.addEventListener("pagehide", save);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			window.removeEventListener("pagehide", save);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);
}
