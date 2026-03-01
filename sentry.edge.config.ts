import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	release: process.env.VERCEL_GIT_COMMIT_SHA,
	environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

	// RGPD: no PII sent by default
	sendDefaultPii: false,

	ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND", "CircuitBreakerError", "DYNAMIC_SERVER_USAGE"],
});
