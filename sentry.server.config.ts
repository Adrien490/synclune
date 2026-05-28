import * as Sentry from "@sentry/nextjs";
import { BusinessError } from "@/shared/lib/actions/business-error";

const PROD_DEFAULT_SAMPLE_RATE = 0.15;
const PROD_CRON_SAMPLE_RATE = 1.0;
const DEV_SAMPLE_RATE = 1.0;

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	release: process.env.VERCEL_GIT_COMMIT_SHA,
	environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

	// Cron jobs are rare (1-48 runs/day across 14 jobs ≈ 430 spans/month).
	// Always sample them — losing 90% of cron traces would hide perf drift.
	tracesSampler: (samplingContext) => {
		const isProd = process.env.NODE_ENV === "production";
		if (!isProd) return DEV_SAMPLE_RATE;
		if (samplingContext.attributes?.["jobName"]) return PROD_CRON_SAMPLE_RATE;
		return PROD_DEFAULT_SAMPLE_RATE;
	},

	// RGPD: no PII sent by default
	sendDefaultPii: false,

	beforeSend(event, hint) {
		const error = hint.originalException;

		// BusinessError = expected user-facing error, not a bug — EXCEPT critical
		// accounting/compliance codes that MUST surface (audit monitoring 2026-05-28
		// EINV-OPS-005). Without this whitelist, a 99_999/year sequence overflow on
		// invoice/credit-note emission would silently noop : payment continues,
		// nothing emitted, no alert, no Sentry trace. Add new codes here whenever a
		// BusinessError must trigger an admin investigation.
		if (error instanceof BusinessError) {
			if (
				error.code === "INVOICE_SEQUENCE_OVERFLOW" ||
				error.code === "CREDIT_NOTE_SEQUENCE_OVERFLOW"
			) {
				return event;
			}
			return null;
		}

		return event;
	},

	ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND", "CircuitBreakerError", "DYNAMIC_SERVER_USAGE"],
});
