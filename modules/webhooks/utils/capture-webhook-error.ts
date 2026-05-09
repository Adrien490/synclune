import * as Sentry from "@sentry/nextjs";

/**
 * Business context attached to webhook exceptions so post-incident debugging
 * keeps the order/refund/dispute identifiers that triggered the failure.
 */
export interface WebhookErrorContext {
	handler: string;
	eventType: string;
	stripeEventId?: string;
	orderId?: string;
	orderNumber?: string;
	paymentIntentId?: string;
	stripeRefundId?: string;
	refundId?: string;
	stripeDisputeId?: string;
	stripeChargeId?: string;
	checkoutSessionId?: string;
	[key: string]: string | undefined;
}

/**
 * Captures a webhook handler exception in Sentry with structured business context.
 *
 * Mirrors `withCronGuard` semantics: tag-based filtering (`webhookHandler`,
 * `eventType`), grouped fingerprint per handler, and a `business` context block
 * carrying the resource identifiers needed to triage the incident.
 */
export function captureWebhookError(error: unknown, context: WebhookErrorContext): void {
	const { handler, eventType, ...business } = context;

	Sentry.withScope((scope) => {
		scope.setTag("webhookHandler", handler);
		scope.setTag("eventType", eventType);
		scope.setLevel("error");
		scope.setFingerprint(["webhook", handler]);

		const businessEntries = Object.entries(business).filter(([, v]) => v !== undefined);
		if (businessEntries.length > 0) {
			scope.setContext("business", Object.fromEntries(businessEntries));
		}

		Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
	});
}
