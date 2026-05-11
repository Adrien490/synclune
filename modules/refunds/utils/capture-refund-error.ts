import * as Sentry from "@sentry/nextjs";

/**
 * Business context attached to refund-action exceptions so post-incident
 * debugging keeps the IDs needed to triage the failure (SAGA Step 3, retry,
 * reconcile cron, etc.).
 */
export interface RefundErrorContext {
	/** Action name : `processRefund`, `retryFailedRefund`, `reconcile-refunds`, etc. */
	action: string;
	/** Specific SAGA step or branch that failed, e.g. `step3-finalize`. */
	step?: string;
	refundId?: string;
	stripeRefundId?: string;
	orderId?: string;
	orderNumber?: string;
	amount?: number;
	[key: string]: string | number | undefined;
}

/**
 * Captures a refund-domain exception in Sentry with structured business context.
 *
 * Mirrors `captureWebhookError` semantics : tag-based filtering
 * (`refundAction`, `refundStep`), grouped fingerprint per action+step, business
 * context block carrying refund/order/stripe identifiers.
 */
export function captureRefundError(error: unknown, context: RefundErrorContext): void {
	const { action, step, ...business } = context;

	Sentry.withScope((scope) => {
		scope.setTag("module", "refunds");
		scope.setTag("refundAction", action);
		if (step) scope.setTag("refundStep", step);
		scope.setLevel("error");
		scope.setFingerprint(step ? ["refunds", action, step] : ["refunds", action]);

		const businessEntries = Object.entries(business).filter(([, v]) => v !== undefined);
		if (businessEntries.length > 0) {
			scope.setContext("business", Object.fromEntries(businessEntries));
		}

		Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
	});
}
