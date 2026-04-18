"use client";

import { useEffect } from "react";
import { preloadHeroImage } from "@/modules/media/lib/sw-image-preload";

/**
 * Precaches a product hero image into the Service Worker's cache pool so
 * subsequent visits (PDP → PDP, PDP → back button) serve it from disk.
 *
 * Runs on idle (requestIdleCallback) to avoid competing with LCP. Safe no-op
 * on browsers without Cache Storage or when `url` is empty.
 */
export function usePreloadHeroImage(url: string | undefined | null) {
	useEffect(() => {
		if (!url) return;
		if (typeof window === "undefined") return;

		const schedule =
			"requestIdleCallback" in window
				? window.requestIdleCallback.bind(window)
				: (cb: () => void) => window.setTimeout(cb, 250);

		const cancel =
			"cancelIdleCallback" in window
				? window.cancelIdleCallback.bind(window)
				: (id: number) => window.clearTimeout(id);

		const id = schedule(() => {
			void preloadHeroImage(url);
		});

		return () => cancel(id as number);
	}, [url]);
}
