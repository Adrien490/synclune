import * as Sentry from "@sentry/nextjs";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { scrubSentryEvent } from "@/shared/lib/sentry-scrub";

const SHARED_IGNORE_ERRORS = [
	"NEXT_REDIRECT",
	"NEXT_NOT_FOUND",
	"CircuitBreakerError",
	"DYNAMIC_SERVER_USAGE",
	"ResizeObserver loop",
	"ChunkLoadError",
];

const initSentry = () => {
	Sentry.init({
		dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
		release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
		environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
		replaysOnErrorSampleRate: 1.0,
		replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

		sendDefaultPii: false,

		beforeSend(event, hint) {
			const error = hint.originalException;
			if (error instanceof BusinessError) return null;
			return scrubSentryEvent(event);
		},

		ignoreErrors: SHARED_IGNORE_ERRORS,
	});
};

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

window.addEventListener("error", (event) => {
	if (event.error instanceof Error) {
		Sentry.captureException(event.error);
	}
});

window.addEventListener("unhandledrejection", (event) => {
	const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
	Sentry.captureException(reason);
});

export function onRouterTransitionStart(
	url: string,
	navigationType: "push" | "replace" | "traverse",
) {
	performance.mark(`nav-${navigationType}-${url}`);
	Sentry.addBreadcrumb({
		category: "navigation",
		level: "info",
		message: `${navigationType} ${url}`,
	});
}
