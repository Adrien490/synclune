import * as Sentry from "@sentry/nextjs";
import { setPostHogInstance } from "@/shared/lib/posthog";

// Defer PostHog loading — it starts with opt_out_capturing_by_default: true,
// so nothing is captured until the user accepts cookies anyway.
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
	const initPostHog = () =>
		import("posthog-js").then(({ default: posthog }) => {
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
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
			setPostHogInstance(posthog);
		});

	if ("requestIdleCallback" in window) {
		requestIdleCallback(() => void initPostHog());
	} else {
		setTimeout(() => void initPostHog(), 1000);
	}
}

// Defer Sentry init to after hydration — errors before init are caught by
// the window.addEventListener("error") fallback below.
const initSentry = () => {
	Sentry.init({
		dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
		release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
		environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
		replaysOnErrorSampleRate: 1.0,
		replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

		sendDefaultPii: false,

		ignoreErrors: [
			"NEXT_REDIRECT",
			"NEXT_NOT_FOUND",
			"ResizeObserver loop",
			"ChunkLoadError",
			"DYNAMIC_SERVER_USAGE",
		],
	});
};

// Defer replay integration — heavy (~50-70 KiB) and not needed on first paint.
// Errors are still captured by base Sentry init above.
const initReplay = () => {
	Sentry.addIntegration(
		Sentry.replayIntegration({
			maskAllText: true,
			maskAllInputs: true,
			blockAllMedia: true,
		}),
	);
};

if ("requestIdleCallback" in window) {
	requestIdleCallback(() => void initSentry());
	setTimeout(() => requestIdleCallback(() => void initReplay()), 5000);
} else {
	setTimeout(() => void initSentry(), 2000);
	setTimeout(() => void initReplay(), 7000);
}

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
