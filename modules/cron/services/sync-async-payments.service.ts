import { updateTag } from "next/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	markOrderAsFailed,
	extractPaymentFailureDetails,
	restoreStockForOrder,
} from "@/modules/webhooks/services/payment-intent.service";
import { processOrderFromPaymentIntent } from "@/modules/webhooks/services/checkout.service";
import { ensureInvoiceNumberPersisted } from "@/modules/orders/services/ensure-invoice-number.service";
import { recordSalesEReporting } from "@/modules/invoices/services/record-ereporting.service";
import { extractPaymentMethodFromPaymentIntent } from "@/modules/payments/services/map-stripe-payment-method";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

/**
 * Synchronizes async payment statuses by polling Stripe.
 *
 * Async payment methods (SEPA Direct Debit, Sofort, etc.) can take
 * 3-5 business days to confirm. This cron polls Stripe to reconcile
 * statuses in case of webhook failure.
 */
export async function syncAsyncPayments(): Promise<CronResult> {
	logger.info("Starting async payment sync", { cronJob: "sync-async-payments" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.warn("STRIPE_SECRET_KEY not configured — skipping run", {
			cronJob: "sync-async-payments",
		});
		return {
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		};
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
			// CACHE-AUDIT-004 : nécessaire pour invalider les tags user-scopés.
			userId: true,
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
	const stockRestoreFailures: Array<{
		orderId: string;
		orderNumber: string;
		error: string;
	}> = [];

	for (const order of pendingOrders) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: "sync-async-payments" });
			break;
		}
		if (!order.stripePaymentIntentId) continue;

		try {
			// Throttle every call (uniform pacing, cap burst at 1/STRIPE_THROTTLE_MS req/s).
			await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
			const paymentIntent = await stripe.paymentIntents.retrieve(
				order.stripePaymentIntentId,
				undefined,
				{
					timeout: STRIPE_TIMEOUT_MS,
				},
			);

			if (paymentIntent.status === "succeeded") {
				// Payment succeeded but webhook was missed
				logger.info("Order payment succeeded (webhook missed)", {
					cronJob: "sync-async-payments",
					orderNumber: order.orderNumber,
				});
				// ORD-STRIPE-001: utiliser le même chemin que le webhook pour garantir
				// le décrément stock + désactivation SKU épuisés + clear cart + facture
				// + e-reporting. processOrderFromPaymentIntent est idempotent (guard
				// paymentStatus === "PAID" dans checkout-order-processing.service.ts).
				const paymentMethod =
					(await extractPaymentMethodFromPaymentIntent(paymentIntent)) ?? undefined;
				await processOrderFromPaymentIntent(order.id, paymentIntent, paymentMethod);
				await ensureInvoiceNumberPersisted(order.id);
				await recordSalesEReporting(order.id);
				// CACHE-AUDIT-004 : invalider les tags user-scopés + détail commande
				// (sinon l'espace client affiche encore PENDING après confirmation async).
				for (const tag of getOrderInvalidationTags(order.userId ?? undefined, order.id)) {
					tagsToInvalidate.add(tag);
				}
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
				// OPS-AUDIT-003 : restore stock FIRST. If it throws, we skip the
				// markOrderAsFailed call → order stays PENDING → re-picked on
				// next 4h run (atomic retry without an extra DB flag). Handles
				// the race where a PAID webhook moved status to PROCESSING
				// between the findMany and this code path.
				let stockResult: Awaited<ReturnType<typeof restoreStockForOrder>>;
				try {
					stockResult = await restoreStockForOrder(order.id);
				} catch (stockError) {
					const stockErrorMessage =
						stockError instanceof Error ? stockError.message : String(stockError);
					logger.error("Stock restore failed — order kept PENDING for next run", stockError, {
						cronJob: "sync-async-payments",
						orderNumber: order.orderNumber,
						orderId: order.id,
					});
					stockRestoreFailures.push({
						orderId: order.id,
						orderNumber: order.orderNumber,
						error: stockErrorMessage,
					});
					errors++;
					continue;
				}
				for (const skuId of stockResult.restoredSkuIds) {
					tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
				}
				await markOrderAsFailed(order.id, order.stripePaymentIntentId, failureDetails);
				// CACHE-AUDIT-004 : idem branche succès.
				for (const tag of getOrderInvalidationTags(order.userId ?? undefined, order.id)) {
					tagsToInvalidate.add(tag);
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
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	// Emit a single aggregated alert for all stock-restore failures (avoid per-order inbox spam)
	if (stockRestoreFailures.length > 0) {
		sendAdminCronFailedAlert({
			job: "sync-async-payments",
			errors: stockRestoreFailures.length,
			details: {
				issue: "stock-restore-failed",
				failures: stockRestoreFailures,
			},
		}).catch((e) =>
			logger.error("Failed to send stock restore alert", e, {
				cronJob: "sync-async-payments",
			}),
		);
	}

	logger.info("Sync completed", { cronJob: "sync-async-payments", updated, errors });

	return {
		processed: updated,
		errored: errors,
		skipped: Math.max(0, pendingOrders.length - updated - errors),
		checked: pendingOrders.length,
		updated,
		errors,
		hasMore: pendingOrders.length === BATCH_SIZE_MEDIUM,
	};
}
