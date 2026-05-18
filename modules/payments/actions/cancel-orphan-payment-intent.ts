"use server";

import { stripe, withStripeCircuitBreaker } from "@/shared/lib/stripe";
import { logger } from "@/shared/lib/logger";

/**
 * Best-effort cancellation of an orphaned Payment Intent.
 * Called when a tab re-init creates a new PI (cart hash changed).
 * Fire-and-forget — failure is non-critical since Stripe auto-cancels
 * uncaptured PIs after 7 days.
 */
export async function cancelOrphanPaymentIntent(paymentIntentId: string): Promise<void> {
	if (!paymentIntentId.startsWith("pi_")) return;

	try {
		await withStripeCircuitBreaker(() => stripe.paymentIntents.cancel(paymentIntentId));
	} catch {
		logger.info("Could not cancel orphan PI (may already be captured/canceled)", {
			service: "checkout",
			paymentIntentId,
		});
	}
}
