import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest",
		ui_host: "https://eu.posthog.com",
		person_profiles: "identified_only",
		capture_pageview: false,
		capture_pageleave: true,
		persistence: "localStorage+cookie",
		opt_out_capturing_by_default: true,
		session_recording: {
			maskAllInputs: true,
			maskTextSelector: "*",
		},
	});
}

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
	environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

	// RGPD: replay only on errors, mask everything
	integrations: [
		Sentry.replayIntegration({
			maskAllText: true,
			maskAllInputs: true,
			blockAllMedia: true,
		}),
	],
	replaysSessionSampleRate: 0,
	replaysOnErrorSampleRate: 1.0,

	sendDefaultPii: false,

	ignoreErrors: [
		"NEXT_REDIRECT",
		"NEXT_NOT_FOUND",
		"ResizeObserver loop",
		"ChunkLoadError",
		"DYNAMIC_SERVER_USAGE",
	],
});

performance.mark("app-init");

// Fallback console logging for environments where Sentry may not load
window.addEventListener("error", (event) => {
	console.error("[CLIENT_ERROR]", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
	console.error("[UNHANDLED_REJECTION]", event.reason);
});

export function onRouterTransitionStart(
	url: string,
	navigationType: "push" | "replace" | "traverse",
) {
	performance.mark(`nav-${navigationType}-${url}`);
}
