"use client";

import posthog from "posthog-js";

export { posthog };

/** Returns the posthog instance only if initialized (key was set) */
export function getPostHog() {
	return process.env.NEXT_PUBLIC_POSTHOG_KEY ? posthog : null;
}
