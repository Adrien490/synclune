import * as Sentry from "@sentry/nextjs";

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
