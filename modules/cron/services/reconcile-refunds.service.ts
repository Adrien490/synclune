import { updateTag } from "next/cache";
import { PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { REFUNDS_CACHE_TAGS } from "@/modules/refunds/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { canTransition } from "@/modules/refunds/services/refund-state-machine.service";
import { captureRefundError } from "@/modules/refunds/utils/capture-refund-error";

/**
 * DLQ refund reconciler.
 *
 * Picks up refunds where the SAGA `processRefund` Step 3 (DB finalization)
 * failed after Step 2 (Stripe call succeeded). Such refunds are stuck in
 * status APPROVED with `stripeRefundId IS NOT NULL AND processedAt IS NULL`.
 * Without this cron, the order `paymentStatus` would never transition to
 * REFUNDED / PARTIALLY_REFUNDED even though Stripe successfully refunded
 * the customer — accounting drift + comptabilité incorrecte (audit TVA risk).
 *
 * Strategy :
 * 1. Find candidate refunds (APPROVED, stripeRefundId set, no processedAt,
 *    last 7 days to bound the scan window).
 * 2. For each : retrieve Stripe refund status. If `succeeded` → finalize
 *    locally (transaction : COMPLETED + processedAt + order paymentStatus).
 *    If `pending` → skip (the webhook will eventually finalize).
 *    If `failed` → mark FAILED locally (idempotent with webhook).
 * 3. Idempotent : guard `status: APPROVED` on each update — concurrent
 *    webhook reconciliation never collides.
 */
export async function reconcileRefunds(): Promise<CronResult | null> {
	logger.info("Starting refund reconciliation", { cronJob: "reconcile-refunds" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.error("STRIPE_SECRET_KEY not configured", undefined, {
			cronJob: "reconcile-refunds",
		});
		return null;
	}

	// Scan window : 7 days, with at least REFUND_RECONCILE_MIN_AGE_MS (1h) of
	// quarantine so the regular webhook path has a chance to finalize first.
	const now = Date.now();
	const maxAge = new Date(now - 7 * 24 * 60 * 60 * 1000);
	const minAge = new Date(now - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS);

	const candidates = await prisma.refund.findMany({
		where: {
			status: RefundStatus.APPROVED,
			stripeRefundId: { not: null },
			processedAt: null,
			createdAt: { gte: maxAge, lt: minAge },
			...notDeleted,
		},
		select: {
			id: true,
			stripeRefundId: true,
			amount: true,
			orderId: true,
			order: {
				select: {
					id: true,
					orderNumber: true,
					total: true,
					userId: true,
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Found refund candidates", {
		cronJob: "reconcile-refunds",
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const refund of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "reconcile-refunds",
			});
			break;
		}
		if (!refund.stripeRefundId) {
			skipped++;
			continue;
		}

		try {
			if (processed > 0 || errored > 0) {
				await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
			}

			const stripeRefund = await stripe.refunds.retrieve(refund.stripeRefundId, undefined, {
				timeout: STRIPE_TIMEOUT_MS,
			});

			if (stripeRefund.status === "succeeded") {
				const finalized = await finalizeRefund({
					refundId: refund.id,
					orderId: refund.orderId,
					orderTotal: refund.order.total,
					refundAmount: refund.amount,
				});
				if (finalized) {
					processed++;
					tagsToInvalidate.add(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
					tagsToInvalidate.add(ORDERS_CACHE_TAGS.REFUNDS(refund.orderId));
					if (refund.order.userId) {
						tagsToInvalidate.add(ORDERS_CACHE_TAGS.USER_ORDERS(refund.order.userId));
					}
				} else {
					skipped++;
				}
			} else if (stripeRefund.status === "failed") {
				const failureReason = stripeRefund.failure_reason ?? "unknown";
				const updated = await prisma.refund.updateMany({
					where: { id: refund.id, status: RefundStatus.APPROVED },
					data: { status: RefundStatus.FAILED, failureReason },
				});
				if (updated.count > 0) {
					processed++;
					tagsToInvalidate.add(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
				} else {
					skipped++;
				}
			} else {
				// pending / requires_action → laisser le webhook ou le prochain run gérer
				skipped++;
			}
		} catch (error) {
			logger.error("Error reconciling refund", error, {
				cronJob: "reconcile-refunds",
				refundId: refund.id,
				stripeRefundId: refund.stripeRefundId,
			});
			captureRefundError(error, {
				action: "reconcile-refunds",
				refundId: refund.id,
				stripeRefundId: refund.stripeRefundId,
				orderId: refund.orderId,
				orderNumber: refund.order.orderNumber,
			});
			errored++;
		}
	}

	if (tagsToInvalidate.size > 0) {
		tagsToInvalidate.add(REFUNDS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(ORDERS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_BADGES);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	logger.info("Reconciliation completed", {
		cronJob: "reconcile-refunds",
		processed,
		errored,
		skipped,
	});

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
	};
}

/**
 * Finalise un refund APPROVED → COMPLETED dans une transaction atomique :
 * - update Refund (status, processedAt) avec guard TOCTOU
 * - recalcule le paymentStatus de l'order
 *
 * Returns false if the refund was no longer APPROVED (concurrent state change
 * by webhook / admin action).
 */
async function finalizeRefund(params: {
	refundId: string;
	orderId: string;
	orderTotal: number;
	refundAmount: number;
}): Promise<boolean> {
	const { refundId, orderId, orderTotal, refundAmount } = params;

	return prisma.$transaction(async (tx) => {
		const updated = await tx.refund.updateMany({
			where: { id: refundId, status: RefundStatus.APPROVED },
			data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
		});
		if (updated.count === 0) {
			// Garde belt-and-suspenders : canTransition est déjà couvert par le
			// guard `status: APPROVED`, mais on logue le diagnostic.
			const current = await tx.refund.findUnique({
				where: { id: refundId },
				select: { status: true },
			});
			if (current && !canTransition(current.status, RefundStatus.COMPLETED)) {
				logger.warn("Refund cannot transition to COMPLETED — concurrent state change", {
					cronJob: "reconcile-refunds",
					refundId,
					currentStatus: current.status,
				});
			}
			return false;
		}

		// Recalcule total COMPLETED après cette finalisation
		const completedAggregate = await tx.refund.aggregate({
			where: { orderId, status: RefundStatus.COMPLETED },
			_sum: { amount: true },
		});
		const totalRefunded = completedAggregate._sum.amount ?? refundAmount;

		if (totalRefunded >= orderTotal) {
			await tx.order.update({
				where: { id: orderId },
				data: { paymentStatus: PaymentStatus.REFUNDED },
			});
		} else if (totalRefunded > 0) {
			await tx.order.update({
				where: { id: orderId },
				data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
			});
		}

		return true;
	});
}
