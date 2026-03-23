"use client";

import type PostHogJs from "posthog-js";

let _posthog: typeof PostHogJs | null = null;

/** Called by instrumentation-client.ts once PostHog is initialized */
export function setPostHogInstance(instance: typeof PostHogJs) {
	_posthog = instance;
}

/** Returns the posthog instance only if initialized (lazy-loaded) */
export function getPostHog() {
	return _posthog;
}
