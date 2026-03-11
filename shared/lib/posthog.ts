"use client";

import type { PostHog } from "posthog-js";

let posthogInstance: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

/**
 * Initialize PostHog client-side with dynamic import.
 * The posthog-js library (~80-100KB) is only loaded when this function is called.
 * Returns the PostHog instance once initialized.
 */
export async function initPostHog(): Promise<PostHog | null> {
	if (typeof window === "undefined") return null;
	if (posthogInstance) return posthogInstance;
	if (initPromise) return initPromise;

	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
	const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

	if (!key) return null;

	initPromise = import("posthog-js").then(({ default: posthog }) => {
		posthog.init(key, {
			api_host: host ?? "/ingest",
			ui_host: "https://eu.posthog.com",
			person_profiles: "identified_only",
			capture_pageview: false, // manual pageview capture via PostHogPageview
			capture_pageleave: true,
			persistence: "localStorage+cookie",
			// RGPD: respect cookie consent
			opt_out_capturing_by_default: true,
			// Mask all text in session replay for privacy
			session_recording: {
				maskAllInputs: true,
				maskTextSelector: "*",
			},
		});
		posthogInstance = posthog;
		return posthog;
	});

	return initPromise;
}

/**
 * Get the PostHog instance if already initialized.
 * Returns null if PostHog hasn't been loaded yet.
 */
export function getPostHogInstance(): PostHog | null {
	return posthogInstance;
}
