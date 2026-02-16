import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	markOrderAsPaid,
	markOrderAsFailed,
	extractPaymentFailureDetails,
	restoreStockForOrder,
} from "@/modules/webhooks/services/payment-intent.service";
import { BATCH_SIZE_MEDIUM, STRIPE_TIMEOUT_MS, THRESHOLDS } from "@/modules/cron/constants/limits";

/**
 * Synchronizes async payment statuses by polling Stripe.
 *
 * Async payment methods (SEPA Direct Debit, Sofort, etc.) can take
 * 3-5 business days to confirm. This cron polls Stripe to reconcile
 * statuses in case of webhook failure.
 */
export async function syncAsyncPayments(): Promise<{
	checked: number;
	updated: number;
	errors: number;
	hasMore: boolean;
} | null> {
	console.log("[CRON:sync-async-payments] Starting async payment sync...");

	const stripe = getStripeClient();
	if (!stripe) {
		console.error("[CRON:sync-async-payments] STRIPE_SECRET_KEY not configured");
		return null;
	}

	// Find PENDING orders created between 1h and 7 days ago
	// (beyond 7 days, async payments typically fail)
	const minAge = new Date(Date.now() - THRESHOLDS.ASYNC_PAYMENT_MIN_AGE_MS);
	const maxAge = new Date(Date.now() - THRESHOLDS.ASYNC_PAYMENT_MAX_AGE_MS);

	const pendingOrders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: { not: null },
			createdAt: {
				gte: maxAge,
				lt: minAge,
			},
			deletedAt: null,
		},
		select: {
			id: true,
			orderNumber: true,
			stripePaymentIntentId: true,
			paymentStatus: true,
		},
		take: BATCH_SIZE_MEDIUM,
	});

	console.log(
		`[CRON:sync-async-payments] Found ${pendingOrders.length} pending orders to check`
	);

	let updated = 0;
	let errors = 0;

	for (const order of pendingOrders) {
		if (!order.stripePaymentIntentId) continue;

		try {
			const paymentIntent = await stripe.paymentIntents.retrieve(
				order.stripePaymentIntentId,
				{ timeout: STRIPE_TIMEOUT_MS }
			);

			if (paymentIntent.status === "succeeded") {
				// Payment succeeded but webhook was missed
				console.log(
					`[CRON:sync-async-payments] Order ${order.orderNumber} payment succeeded (webhook missed)`
				);
				await markOrderAsPaid(order.id, order.stripePaymentIntentId);
				updated++;
			} else if (
				paymentIntent.status === "canceled" ||
				paymentIntent.status === "requires_payment_method"
			) {
				// Payment failed
				console.log(
					`[CRON:sync-async-payments] Order ${order.orderNumber} payment failed: ${paymentIntent.status}`
				);
				const failureDetails = extractPaymentFailureDetails(paymentIntent);
				await markOrderAsFailed(order.id, order.stripePaymentIntentId, failureDetails);
				try {
					await restoreStockForOrder(order.id);
				} catch (stockError) {
					console.error(
						`[STOCK-RESTORE-FAILED] Order ${order.orderNumber} (${order.id}): stock not restored after payment failure`,
						stockError instanceof Error ? stockError.message : String(stockError)
					);
				}
				updated++;
			}
			// Other statuses (processing, requires_action) are still pending
		} catch (error) {
			console.error(
				`[CRON:sync-async-payments] Error checking order ${order.orderNumber}:`,
				error instanceof Error ? error.message : String(error)
			);
			errors++;
		}
	}

	console.log(
		`[CRON:sync-async-payments] Sync completed: ${updated} updated, ${errors} errors`
	);

	return {
		checked: pendingOrders.length,
		updated,
		errors,
		hasMore: pendingOrders.length === BATCH_SIZE_MEDIUM,
	};
}
