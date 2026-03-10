import { updateTag } from "next/cache";
import { PaymentStatus, OrderStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	PENDING_ORDER_MAX_AGE_MS,
} from "@/modules/cron/constants/limits";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

const CRON_JOB = "cleanup-pending-orders";

/**
 * Non-terminal PI statuses that indicate the payment will not succeed.
 * Orders with these PI statuses are safe to cancel.
 */
const CANCELLABLE_PI_STATUSES = new Set([
	"canceled",
	"requires_payment_method",
	"requires_confirmation",
]);

/**
 * Cleans up orphaned PENDING orders from the Payment Intent flow.
 *
 * When a user creates an order via confirmCheckout but the payment never
 * completes (browser closed, Stripe outage, etc.), the order stays PENDING
 * indefinitely. This cron:
 * 1. Finds PENDING orders older than 30 minutes with a PI ID
 * 2. Checks the PI status on Stripe
 * 3. Cancels orders whose PI is in a non-terminal state
 * 4. Releases discount usages
 */
export async function cleanupPendingOrders(): Promise<{
	checked: number;
	cancelled: number;
	errors: number;
	hasMore: boolean;
} | null> {
	logger.info("Starting pending orders cleanup", { cronJob: CRON_JOB });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.error("STRIPE_SECRET_KEY not configured", undefined, { cronJob: CRON_JOB });
		return null;
	}

	const cutoff = new Date(Date.now() - PENDING_ORDER_MAX_AGE_MS);

	const pendingOrders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PENDING,
			status: OrderStatus.PENDING,
			stripePaymentIntentId: { not: null },
			createdAt: { lt: cutoff },
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			stripePaymentIntentId: true,
		},
		take: BATCH_SIZE_MEDIUM,
	});

	logger.info("Found pending orders to check", {
		cronJob: CRON_JOB,
		count: pendingOrders.length,
	});

	let cancelled = 0;
	let errors = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const invalidatedDiscountIds = new Set<string>();

	for (const order of pendingOrders) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: CRON_JOB });
			break;
		}
		if (!order.stripePaymentIntentId) continue;

		try {
			// Throttle Stripe API calls
			if (cancelled > 0 || errors > 0) {
				await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
			}

			const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, {
				timeout: STRIPE_TIMEOUT_MS,
			});

			if (!CANCELLABLE_PI_STATUSES.has(paymentIntent.status)) {
				// PI is still active (processing, requires_action, succeeded)
				// Skip — either the payment is in progress or already handled by webhooks
				continue;
			}

			// Cancel the order and release discount usages
			const releasedDiscountIds = await cancelOrphanedOrder(order.id);
			for (const id of releasedDiscountIds) {
				invalidatedDiscountIds.add(id);
			}

			logger.info("Cancelled orphaned pending order", {
				cronJob: CRON_JOB,
				orderNumber: order.orderNumber,
				piStatus: paymentIntent.status,
			});
			cancelled++;
		} catch (error) {
			logger.error("Error checking pending order", error, {
				cronJob: CRON_JOB,
				orderNumber: order.orderNumber,
			});
			errors++;
		}
	}

	// Invalidate caches if any orders were cancelled
	if (cancelled > 0) {
		const tagsToInvalidate: string[] = [
			ORDERS_CACHE_TAGS.LIST,
			SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
			DASHBOARD_CACHE_TAGS.KPIS,
			DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
		];
		for (const discountId of invalidatedDiscountIds) {
			tagsToInvalidate.push(DISCOUNT_CACHE_TAGS.USAGE(discountId));
		}
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	// Alert admin on errors
	if (errors > 0) {
		sendAdminCronFailedAlert({
			job: CRON_JOB,
			errors,
			details: { checked: pendingOrders.length, cancelled },
		}).catch((e) => logger.error("Failed to send admin alert", e, { cronJob: CRON_JOB }));
	}

	logger.info("Cleanup completed", { cronJob: CRON_JOB, cancelled, errors });

	return {
		checked: pendingOrders.length,
		cancelled,
		errors,
		hasMore: pendingOrders.length === BATCH_SIZE_MEDIUM,
	};
}

/**
 * Cancels an orphaned order and releases its discount usages in a transaction.
 * Returns the IDs of discounts whose usages were released (for cache invalidation).
 */
async function cancelOrphanedOrder(orderId: string): Promise<string[]> {
	return prisma.$transaction(async (tx) => {
		// Double-check the order is still PENDING inside the transaction
		const order = await tx.order.findUnique({
			where: { id: orderId },
			select: { paymentStatus: true },
		});

		if (!order || order.paymentStatus !== PaymentStatus.PENDING) {
			return [];
		}

		// Release discount usages
		const discountUsages = await tx.discountUsage.findMany({
			where: { orderId },
			select: { id: true, discountId: true },
		});

		const releasedDiscountIds: string[] = [];
		for (const usage of discountUsages) {
			await tx.discount.update({
				where: { id: usage.discountId },
				data: { usageCount: { decrement: 1 } },
			});
			releasedDiscountIds.push(usage.discountId);
		}

		if (discountUsages.length > 0) {
			await tx.discountUsage.deleteMany({ where: { orderId } });
		}

		// Cancel the order
		await tx.order.update({
			where: { id: orderId },
			data: {
				status: OrderStatus.CANCELLED,
				paymentStatus: PaymentStatus.EXPIRED,
			},
		});

		return releasedDiscountIds;
	});
}
