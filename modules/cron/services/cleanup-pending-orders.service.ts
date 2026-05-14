import { updateTag } from "next/cache";
import {
	OrderStatus,
	PaymentStatus,
	HistorySource,
	OrderAction,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { BATCH_DEADLINE_MS, BATCH_SIZE_LARGE, THRESHOLDS } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

/**
 * Cancels stale PENDING orders left behind by abandoned checkouts.
 *
 * Scope: orders where status=PENDING + paymentStatus=PENDING + stripePaymentIntentId IS NULL
 * older than PENDING_ORDER_TIMEOUT_MS (24h).
 *
 * Why we exclude orders with stripePaymentIntentId: those are async payment
 * flows (SEPA, Sofort) handled by sync-async-payments which polls Stripe up
 * to 10 days. Touching them here would race with that cron.
 *
 * Effects per order (atomic):
 *  - status → CANCELLED
 *  - stock restored (inventory increment)
 *  - discount usages released (usageCount decrement + DiscountUsage delete)
 *  - audit trail (HistorySource.SYSTEM, OrderAction.CANCELLED)
 *
 * No email sent to the customer: the checkout session was abandoned, so there
 * is no reasonable expectation that a confirmation/cancellation would be useful.
 */
export async function cleanupPendingOrders(): Promise<CronResult> {
	const cutoff = new Date(Date.now() - THRESHOLDS.PENDING_ORDER_TIMEOUT_MS);

	const candidates = await prisma.order.findMany({
		where: {
			status: OrderStatus.PENDING,
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: null,
			createdAt: { lt: cutoff },
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			createdAt: true,
			items: { select: { id: true, skuId: true, quantity: true } },
		},
		take: BATCH_SIZE_LARGE,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Cleanup candidates loaded", {
		cronJob: "cleanup-pending-orders",
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>([
		ORDERS_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	]);

	for (const order of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "cleanup-pending-orders",
				processed,
				remaining: candidates.length - processed - errored,
			});
			break;
		}

		try {
			await prisma.$transaction(async (tx) => {
				const fresh = await tx.order.findUnique({
					where: { id: order.id, ...notDeleted },
					select: { status: true, paymentStatus: true, stripePaymentIntentId: true },
				});
				if (
					!fresh ||
					fresh.status !== OrderStatus.PENDING ||
					fresh.paymentStatus !== PaymentStatus.PENDING ||
					fresh.stripePaymentIntentId !== null
				) {
					return;
				}

				await tx.order.update({
					where: { id: order.id },
					data: { status: OrderStatus.CANCELLED },
				});

				for (const item of order.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: { inventory: { increment: item.quantity } },
					});
					tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.SKU_STOCK(item.skuId));
				}

				const usages = await tx.discountUsage.findMany({
					where: { orderId: order.id },
					select: { id: true, discountId: true },
				});
				for (const usage of usages) {
					await tx.discount.update({
						where: { id: usage.discountId },
						data: { usageCount: { decrement: 1 } },
					});
				}
				if (usages.length > 0) {
					await tx.discountUsage.deleteMany({ where: { orderId: order.id } });
				}

				await createOrderAuditTx(tx, {
					orderId: order.id,
					action: OrderAction.CANCELLED,
					previousStatus: OrderStatus.PENDING,
					newStatus: OrderStatus.CANCELLED,
					note: "Auto-annulation : panier abandonné (>24h sans paiement)",
					authorName: "Système",
					source: HistorySource.SYSTEM,
					metadata: {
						reason: "abandoned_checkout",
						itemsCount: order.items.length,
						releasedDiscountsCount: usages.length,
						ageHours: Math.floor((Date.now() - order.createdAt.getTime()) / (60 * 60 * 1000)),
					},
				});
			});

			processed++;
		} catch (error) {
			errored++;
			logger.error("Failed to cancel stale pending order", error, {
				cronJob: "cleanup-pending-orders",
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}
	}

	if (processed > 0) {
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	logger.info("Cleanup completed", {
		cronJob: "cleanup-pending-orders",
		processed,
		errored,
	});

	return {
		processed,
		errored,
		skipped: Math.max(0, candidates.length - processed - errored),
		hasMore: candidates.length === BATCH_SIZE_LARGE,
		cancelled: processed,
	};
}
