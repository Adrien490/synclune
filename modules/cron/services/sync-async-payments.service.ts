import { updateTag } from "next/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	markOrderAsPaid,
	markOrderAsFailed,
	extractPaymentFailureDetails,
	restoreStockForOrder,
} from "@/modules/webhooks/services/payment-intent.service";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

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
	logger.info("Starting async payment sync", { cronJob: "sync-async-payments" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.error("STRIPE_SECRET_KEY not configured", undefined, { cronJob: "sync-async-payments" });
		return null;
	}

	// Find PENDING orders created between 1h and 10 days ago
	// (SEPA Direct Debit can take up to 10 business days)
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
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			stripePaymentIntentId: true,
			paymentStatus: true,
		},
		take: BATCH_SIZE_MEDIUM,
	});

	logger.info("Found pending orders to check", {
		cronJob: "sync-async-payments",
		count: pendingOrders.length,
	});

	let updated = 0;
	let errors = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const order of pendingOrders) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: "sync-async-payments" });
			break;
		}
		if (!order.stripePaymentIntentId) continue;

		try {
			// Throttle to avoid Stripe rate limits
			if (updated > 0 || errors > 0) {
				await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
			}
			const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, {
				timeout: STRIPE_TIMEOUT_MS,
			});

			if (paymentIntent.status === "succeeded") {
				// Payment succeeded but webhook was missed
				logger.info("Order payment succeeded (webhook missed)", {
					cronJob: "sync-async-payments",
					orderNumber: order.orderNumber,
				});
				await markOrderAsPaid(order.id, order.stripePaymentIntentId);
				updated++;
			} else if (
				paymentIntent.status === "canceled" ||
				paymentIntent.status === "requires_payment_method"
			) {
				// Payment failed
				logger.info("Order payment failed", {
					cronJob: "sync-async-payments",
					orderNumber: order.orderNumber,
					stripeStatus: paymentIntent.status,
				});
				const failureDetails = extractPaymentFailureDetails(paymentIntent);
				await markOrderAsFailed(order.id, order.stripePaymentIntentId, failureDetails);
				try {
					const stockResult = await restoreStockForOrder(order.id);
					for (const skuId of stockResult.restoredSkuIds) {
						tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
					}
				} catch (stockError) {
					const stockErrorMessage =
						stockError instanceof Error ? stockError.message : String(stockError);
					logger.error(
						"[STOCK-RESTORE-FAILED] Stock not restored after payment failure",
						stockError,
						{ cronJob: "sync-async-payments", orderNumber: order.orderNumber, orderId: order.id },
					);
					sendAdminCronFailedAlert({
						job: "sync-async-payments",
						errors: 1,
						details: {
							issue: "stock-restore-failed",
							orderNumber: order.orderNumber,
							orderId: order.id,
							error: stockErrorMessage,
						},
					}).catch((e) =>
						logger.error("Failed to send stock restore alert", e, {
							cronJob: "sync-async-payments",
						}),
					);
				}
				updated++;
			}
			// Other statuses (processing, requires_action) are still pending
		} catch (error) {
			logger.error("Error checking order", error, {
				cronJob: "sync-async-payments",
				orderNumber: order.orderNumber,
			});
			errors++;
		}
	}

	// Invalidate caches if any orders were updated
	if (updated > 0) {
		tagsToInvalidate.add(ORDERS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_BADGES);
		tagsToInvalidate.add(DASHBOARD_CACHE_TAGS.KPIS);
		tagsToInvalidate.add(DASHBOARD_CACHE_TAGS.REVENUE_CHART);
		tagsToInvalidate.add(DASHBOARD_CACHE_TAGS.RECENT_ORDERS);
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	logger.info("Sync completed", { cronJob: "sync-async-payments", updated, errors });

	return {
		checked: pendingOrders.length,
		updated,
		errors,
		hasMore: pendingOrders.length === BATCH_SIZE_MEDIUM,
	};
}
