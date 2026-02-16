import { RefundStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
} from "@/modules/webhooks/services/refund.service";
import { BATCH_SIZE_MEDIUM, STRIPE_TIMEOUT_MS, THRESHOLDS } from "@/modules/cron/constants/limits";

/**
 * Reconciles pending refunds by polling Stripe.
 *
 * Refunds with APPROVED status and a stripeRefundId wait for the
 * refund.updated webhook to transition to COMPLETED.
 * This cron polls Stripe to reconcile in case of webhook failure.
 */
export async function reconcilePendingRefunds(): Promise<{
	checked: number;
	updated: number;
	errors: number;
	hasMore: boolean;
} | null> {
	console.log("[CRON:reconcile-refunds] Starting refund reconciliation...");

	const stripe = getStripeClient();
	if (!stripe) {
		console.error("[CRON:reconcile-refunds] STRIPE_SECRET_KEY not configured");
		return null;
	}

	// Find APPROVED refunds with a stripeRefundId processed more than 1h ago
	// (give webhooks time to arrive first)
	const minAge = new Date(Date.now() - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS);

	const pendingRefunds = await prisma.refund.findMany({
		where: {
			status: RefundStatus.APPROVED,
			stripeRefundId: { not: null },
			processedAt: { lt: minAge },
			deletedAt: null,
		},
		select: {
			id: true,
			stripeRefundId: true,
			status: true,
			order: {
				select: {
					orderNumber: true,
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
	});

	console.log(
		`[CRON:reconcile-refunds] Found ${pendingRefunds.length} pending refunds to check`
	);

	let updated = 0;
	let errors = 0;

	for (const refund of pendingRefunds) {
		if (!refund.stripeRefundId) continue;

		try {
			const stripeRefund = await stripe.refunds.retrieve(
				refund.stripeRefundId,
				{ timeout: STRIPE_TIMEOUT_MS }
			);

			const newStatus = mapStripeRefundStatus(stripeRefund.status);

			// Update if status has changed
			if (newStatus !== refund.status) {
				if (newStatus === RefundStatus.COMPLETED) {
					await updateRefundStatus(
						refund.id,
						RefundStatus.COMPLETED,
						stripeRefund.status || "unknown"
					);
					console.log(
						`[CRON:reconcile-refunds] Refund ${refund.id} marked as COMPLETED`
					);
					updated++;
				} else if (newStatus === RefundStatus.FAILED) {
					await markRefundAsFailed(
						refund.id,
						stripeRefund.failure_reason || "Unknown failure"
					);
					console.log(
						`[CRON:reconcile-refunds] Refund ${refund.id} marked as FAILED`
					);
					updated++;
				}
			}
		} catch (error) {
			console.error(
				`[CRON:reconcile-refunds] Error checking refund ${refund.id}:`,
				error
			);
			errors++;
		}
	}

	console.log(
		`[CRON:reconcile-refunds] Reconciliation completed: ${updated} updated, ${errors} errors`
	);

	return {
		checked: pendingRefunds.length,
		updated,
		errors,
		hasMore: pendingRefunds.length === BATCH_SIZE_MEDIUM,
	};
}
