"use client";

import posthog from "posthog-js";

/**
 * Initialize PostHog client-side
 * Called once from PostHogProvider on mount
 */
export function initPostHog() {
	if (typeof window === "undefined") return;

	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
	const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

	if (!key) return;

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
}

export { posthog };
