"use client";

import { useLinkStatus } from "next/link";

/**
 * Visual hint shown inside a <Link> when the navigation is pending.
 *
 * Uses Next.js `useLinkStatus` — must be rendered as a descendant of <Link>.
 * A 100ms CSS animation-delay acts as a debounce so fast navigations show nothing.
 */
export function LoadingIndicator() {
	const { pending } = useLinkStatus();

	return pending ? (
		<span
			aria-hidden="true"
			className="bg-primary/60 absolute inset-x-1 bottom-0 h-0.5 animate-pulse rounded-full [animation-delay:100ms] [animation-fill-mode:backwards]"
		/>
	) : null;
}
