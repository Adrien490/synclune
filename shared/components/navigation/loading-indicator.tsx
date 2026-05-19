"use client";

import { useLinkStatus } from "next/link";

/**
 * Visual hint shown inside a <Link> when the navigation is pending.
 *
 * Uses Next.js `useLinkStatus` — must be rendered as a descendant of <Link>.
 *
 * Design:
 * - `fade-in` + `slide-in-from-left-1` keyframes start at opacity 0 / translateX(-4px),
 *   so with `animation-fill-mode:backwards` + 100ms delay, fast navigations (< 100ms)
 *   show nothing — true debounce. Slower navigations get a subtle directional cue
 *   (the bar slides in from the left, hinting forward motion).
 * - `bg-primary/70` keeps brand color while bumping opacity above the WCAG 1.4.11
 *   non-text contrast threshold across both light shop and dark admin surfaces.
 * - `transform-gpu` forces compositor layer so the slide stays smooth on low-end
 *   mobile (the only consumers that paint this every nav).
 */
export function LoadingIndicator() {
	const { pending } = useLinkStatus();

	return pending ? (
		<span
			aria-hidden="true"
			className="bg-primary/70 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1 pointer-events-none absolute inset-x-1 bottom-0 h-0.5 transform-gpu rounded-full [animation-delay:100ms] [animation-fill-mode:backwards] motion-safe:duration-200 motion-safe:ease-out"
		/>
	) : null;
}
