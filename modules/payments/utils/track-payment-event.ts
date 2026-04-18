import { getPostHog } from "@/shared/lib/posthog";

/**
 * PostHog payment funnel events.
 *
 * Instruments checkout conversion funnel:
 * - `payment_succeeded` on `/paiement/confirmation` render (via PostHogTrack)
 * - `payment_failed` on `/paiement/annulation` render (via PostHogTrack)
 * - `payment_error` from PayButton on any client-side Stripe error
 */

export interface PaymentErrorProperties {
	type: string;
	code?: string;
	message?: string;
	phase: "elements-submit" | "confirm-checkout" | "confirm-payment" | "exception";
}

export function trackPaymentError(properties: PaymentErrorProperties) {
	getPostHog()?.capture("payment_error", properties);
}
