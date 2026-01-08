import { RefundStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
} from "@/modules/webhooks/services/refund.service";
import { BATCH_SIZE_MEDIUM, THRESHOLDS } from "@/modules/cron/constants/limits";

/**
 * Service de réconciliation des remboursements pending
 *
 * Les remboursements avec status APPROVED et stripeRefundId attendent
 * le webhook refund.updated pour passer à COMPLETED.
 * Ce cron poll Stripe pour réconcilier en cas d'échec webhook.
 */
export async function reconcilePendingRefunds(): Promise<{
	checked: number;
	updated: number;
	errors: number;
} | null> {
	console.log("[CRON:reconcile-refunds] Starting refund reconciliation...");

	const stripe = getStripeClient();
	if (!stripe) {
		console.error("[CRON:reconcile-refunds] STRIPE_SECRET_KEY not configured");
		return null;
	}

	// Trouver les remboursements APPROVED avec un stripeRefundId
	// traités il y a plus d'1h (laisser le temps aux webhooks)
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
			const stripeRefund = await stripe.refunds.retrieve(refund.stripeRefundId);

			const newStatus = mapStripeRefundStatus(stripeRefund.status);

			// Si le statut a changé
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
	};
}
