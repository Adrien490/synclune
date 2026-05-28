"use client";

import { useEffect, useState, type RefObject } from "react";

interface UseInViewOptions {
	/** IntersectionObserver threshold (0..1). Default 0.8 = 80% visible. */
	threshold?: number;
	/** IntersectionObserver rootMargin (e.g. "200px 0px"). */
	rootMargin?: string;
	/** When true, stop observing after the first intersection. */
	once?: boolean;
	/** Disable observation entirely (useful for opt-in features). */
	enabled?: boolean;
}

/**
 * Detect whether an element is in the viewport via IntersectionObserver.
 *
 * SSR-safe: returns false on first render (server) and during hydration
 * until the effect runs. Cleans up the observer on unmount or ref change.
 */
export function useInView(
	ref: RefObject<Element | null>,
	{ threshold = 0.8, rootMargin, once = false, enabled = true }: UseInViewOptions = {},
): boolean {
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		if (!enabled) return;
		const target = ref.current;
		if (!target || typeof IntersectionObserver === "undefined") return;

		const observer = new IntersectionObserver(
			([entry]) => {
				const intersecting = entry?.isIntersecting ?? false;
				setIsInView(intersecting);
				if (once && intersecting) observer.disconnect();
			},
			{ threshold, rootMargin },
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, [ref, threshold, rootMargin, once, enabled]);

	return isInView;
}
