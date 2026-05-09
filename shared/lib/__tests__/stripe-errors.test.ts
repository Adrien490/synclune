import { describe, it, expect } from "vitest";
import Stripe from "stripe";

import { classifyStripeError, isStripeError } from "../stripe-errors";

type RawStripeError = Stripe.StripeRawError;

describe("classifyStripeError", () => {
	// ---------------------------------------------------------------
	// 'user' bucket — declined cards
	// ---------------------------------------------------------------

	it("classifies StripeCardError as 'user' (declined card, not retryable, info)", () => {
		const err = new Stripe.errors.StripeCardError({
			type: "StripeCardError",
			code: "card_declined",
			message: "Your card was declined",
		} as unknown as RawStripeError);

		const classification = classifyStripeError(err);

		expect(classification).toEqual({
			kind: "user",
			retryable: false,
			severity: "info",
			code: "card_declined",
			type: "StripeCardError",
		});
	});

	it("preserves the Stripe decline code (e.g. insufficient_funds) in the classification", () => {
		const err = new Stripe.errors.StripeCardError({
			type: "StripeCardError",
			code: "insufficient_funds",
			message: "Funds insufficient",
		} as unknown as RawStripeError);

		expect(classifyStripeError(err).code).toBe("insufficient_funds");
	});

	// ---------------------------------------------------------------
	// 'transient' bucket — rate limit / connection
	// ---------------------------------------------------------------

	it("classifies StripeRateLimitError as 'transient' (retryable, warning)", () => {
		const err = new Stripe.errors.StripeRateLimitError({
			type: "StripeRateLimitError",
			message: "Too many requests",
		} as unknown as RawStripeError);

		const classification = classifyStripeError(err);

		expect(classification.kind).toBe("transient");
		expect(classification.retryable).toBe(true);
		expect(classification.severity).toBe("warning");
	});

	it("classifies StripeConnectionError as 'transient'", () => {
		const err = new Stripe.errors.StripeConnectionError({
			type: "StripeConnectionError",
			message: "Network error",
		} as unknown as RawStripeError);

		const classification = classifyStripeError(err);

		expect(classification.kind).toBe("transient");
		expect(classification.retryable).toBe(true);
	});

	// ---------------------------------------------------------------
	// 'bug' bucket — invalid request / auth / idempotency
	// ---------------------------------------------------------------

	it("classifies StripeInvalidRequestError as 'bug' (not retryable, error severity)", () => {
		const err = new Stripe.errors.StripeInvalidRequestError({
			type: "StripeInvalidRequestError",
			message: "Invalid request",
		} as unknown as RawStripeError);

		const classification = classifyStripeError(err);

		expect(classification.kind).toBe("bug");
		expect(classification.retryable).toBe(false);
		expect(classification.severity).toBe("error");
	});

	it("classifies StripeAuthenticationError as 'bug'", () => {
		const err = new Stripe.errors.StripeAuthenticationError({
			type: "StripeAuthenticationError",
			message: "Bad key",
		} as unknown as RawStripeError);

		expect(classifyStripeError(err).kind).toBe("bug");
	});

	it("classifies StripeAPIError as 'bug'", () => {
		const err = new Stripe.errors.StripeAPIError({
			type: "StripeAPIError",
			message: "API down",
		} as unknown as RawStripeError);

		expect(classifyStripeError(err).kind).toBe("bug");
	});

	it("classifies StripePermissionError as 'bug'", () => {
		const err = new Stripe.errors.StripePermissionError({
			type: "StripePermissionError",
			message: "No permission",
		} as unknown as RawStripeError);

		expect(classifyStripeError(err).kind).toBe("bug");
	});

	it("classifies StripeIdempotencyError as 'bug' (idempotency mismatch — page on-call)", () => {
		const err = new Stripe.errors.StripeIdempotencyError({
			type: "StripeIdempotencyError",
			message: "Idempotency mismatch",
		} as unknown as RawStripeError);

		const classification = classifyStripeError(err);

		expect(classification.kind).toBe("bug");
		expect(classification.severity).toBe("error");
	});

	// ---------------------------------------------------------------
	// 'unknown' bucket — non-Stripe / unrecognised
	// ---------------------------------------------------------------

	it("returns 'unknown' for non-Stripe errors", () => {
		const classification = classifyStripeError(new Error("plain JS error"));

		expect(classification).toEqual({
			kind: "unknown",
			retryable: false,
			severity: "error",
		});
	});

	it("returns 'unknown' for non-Error values (string, null, etc.)", () => {
		expect(classifyStripeError("oops")).toEqual({
			kind: "unknown",
			retryable: false,
			severity: "error",
		});
		expect(classifyStripeError(null)).toMatchObject({ kind: "unknown" });
		expect(classifyStripeError(undefined)).toMatchObject({ kind: "unknown" });
	});
});

describe("isStripeError", () => {
	it("returns true for any Stripe error subclass", () => {
		const cardErr = new Stripe.errors.StripeCardError({
			type: "StripeCardError",
			message: "Declined",
		} as unknown as RawStripeError);
		const rateLimitErr = new Stripe.errors.StripeRateLimitError({
			type: "StripeRateLimitError",
			message: "Too many",
		} as unknown as RawStripeError);

		expect(isStripeError(cardErr)).toBe(true);
		expect(isStripeError(rateLimitErr)).toBe(true);
	});

	it("returns false for plain JS Errors", () => {
		expect(isStripeError(new Error("nope"))).toBe(false);
	});

	it("returns false for non-Error values", () => {
		expect(isStripeError("string")).toBe(false);
		expect(isStripeError(null)).toBe(false);
		expect(isStripeError(undefined)).toBe(false);
		expect(isStripeError({ message: "fake" })).toBe(false);
	});
});
