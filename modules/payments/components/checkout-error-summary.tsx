"use client";

import { ErrorSummary, type ErrorSummaryField } from "@/shared/components/forms/error-summary";

interface CheckoutErrorSummaryProps {
	fieldErrors: ErrorSummaryField[];
}

/**
 * Checkout-specific wrapper around the shared {@link ErrorSummary}.
 * Kept for backwards compatibility — new consumers should import
 * `ErrorSummary` from `@/shared/components/forms/error-summary` directly.
 */
export function CheckoutErrorSummary({ fieldErrors }: CheckoutErrorSummaryProps) {
	return <ErrorSummary fieldErrors={fieldErrors} ariaLive="assertive" />;
}
