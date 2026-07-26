import Stripe from "stripe";

type StripeErrorKind = "user" | "transient" | "bug" | "unknown";

export interface StripeErrorClassification {
	kind: StripeErrorKind;
	retryable: boolean;
	severity: "info" | "warning" | "error";
	code?: string;
	type?: string;
}

/**
 * Classify a Stripe error to drive logging severity, Sentry routing, and retries.
 *
 * - `user`     : decline (CardError) — show user-friendly message, never retry, do not page on-call.
 * - `transient`: rate limit / network / API timeout — retry with backoff, low severity.
 * - `bug`      : invalid request, authentication, idempotency mismatch — high severity, page.
 * - `unknown`  : non-Stripe error or unrecognised — default to bug-like handling.
 */
export function classifyStripeError(error: unknown): StripeErrorClassification {
	if (error instanceof Stripe.errors.StripeCardError) {
		return {
			kind: "user",
			retryable: false,
			severity: "info",
			code: error.code,
			type: error.type,
		};
	}

	if (
		error instanceof Stripe.errors.StripeRateLimitError ||
		error instanceof Stripe.errors.StripeConnectionError
	) {
		return {
			kind: "transient",
			retryable: true,
			severity: "warning",
			code: error.code,
			type: error.type,
		};
	}

	if (
		error instanceof Stripe.errors.StripeAPIError ||
		error instanceof Stripe.errors.StripeAuthenticationError ||
		error instanceof Stripe.errors.StripePermissionError ||
		error instanceof Stripe.errors.StripeIdempotencyError ||
		error instanceof Stripe.errors.StripeInvalidRequestError
	) {
		return {
			kind: "bug",
			retryable: false,
			severity: "error",
			code: error.code,
			type: error.type,
		};
	}

	return {
		kind: "unknown",
		retryable: false,
		severity: "error",
	};
}

export function isStripeError(
	error: unknown,
): error is InstanceType<typeof Stripe.errors.StripeError> {
	return error instanceof Stripe.errors.StripeError;
}
