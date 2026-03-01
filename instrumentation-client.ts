import * as Sentry from "@sentry/nextjs";

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
