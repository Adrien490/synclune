import { updateTag } from "next/cache";
import { RefundStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
	sendRefundFailedAlert,
} from "@/modules/webhooks/services/refund.service";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM, STRIPE_THROTTLE_MS, STRIPE_TIMEOUT_MS, THRESHOLDS } from "@/modules/cron/constants/limits";

/**
 * Reconciles pending refunds by polling Stripe.
 *
 * Phase 1: APPROVED refunds with a stripeRefundId - poll Stripe for final status.
 * Phase 2: Stale PENDING/APPROVED refunds without stripeRefundId - alert admin.
 *   These are "phantom refunds" created in DB but never processed through Stripe
 *   (e.g. crash between createRefund and processRefund).
 */
export async function reconcilePendingRefunds(): Promise<{
	checked: number;
	updated: number;
	errors: number;
	staleAlerted: number;
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
			...notDeleted,
		},
		select: {
			id: true,
			stripeRefundId: true,
			status: true,
			amount: true,
			orderId: true,
			order: {
				select: {
					id: true,
					orderNumber: true,
					customerEmail: true,
					stripePaymentIntentId: true,
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
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const refund of pendingRefunds) {
		if (Date.now() > deadline) {
			console.warn("[CRON:reconcile-refunds] Approaching timeout, stopping batch early");
			break;
		}
		if (!refund.stripeRefundId) continue;

		try {
			// Throttle to avoid Stripe rate limits
			if (updated > 0 || errors > 0) {
				await new Promise(resolve => setTimeout(resolve, STRIPE_THROTTLE_MS));
			}
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
					tagsToInvalidate.add(ORDERS_CACHE_TAGS.REFUNDS(refund.orderId));
					updated++;
				} else if (newStatus === RefundStatus.FAILED) {
					const failureReason = stripeRefund.failure_reason || "Unknown failure";
					await markRefundAsFailed(refund.id, failureReason);
					sendRefundFailedAlert(refund, failureReason).catch(() => {});
					console.log(
						`[CRON:reconcile-refunds] Refund ${refund.id} marked as FAILED`
					);
					tagsToInvalidate.add(ORDERS_CACHE_TAGS.REFUNDS(refund.orderId));
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

	// ========================================================================
	// Phase 2: Detect stale refunds without stripeRefundId (phantom refunds)
	// These were created in DB but never processed through Stripe
	// ========================================================================
	const staleAge = new Date(Date.now() - THRESHOLDS.REFUND_STALE_PENDING_MS);

	const staleRefunds = await prisma.refund.findMany({
		where: {
			status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
			stripeRefundId: null,
			createdAt: { lt: staleAge },
			...notDeleted,
		},
		select: {
			id: true,
			status: true,
			amount: true,
			createdAt: true,
			orderId: true,
			order: {
				select: {
					id: true,
					orderNumber: true,
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
	});

	let staleAlerted = 0;

	if (staleRefunds.length > 0) {
		console.warn(
			`[CRON:reconcile-refunds] Found ${staleRefunds.length} stale refund(s) without Stripe ID`
		);

		for (const stale of staleRefunds) {
			const ageHours = Math.round(
				(Date.now() - stale.createdAt.getTime()) / (1000 * 60 * 60)
			);
			console.warn(
				`[CRON:reconcile-refunds] Stale refund ${stale.id} (${stale.status}, ${ageHours}h old) ` +
				`for order ${stale.order.orderNumber} - amount: ${stale.amount} cents. ` +
				`No stripeRefundId found. Admin action required.`
			);

			// Create an admin OrderNote to flag the stale refund
			try {
				await prisma.orderNote.create({
					data: {
						orderId: stale.orderId,
						content:
							`[REMBOURSEMENT ORPHELIN] Le remboursement ${stale.id} (${stale.amount / 100} EUR, statut: ${stale.status}) ` +
							`est en attente depuis ${ageHours}h sans avoir ete transmis a Stripe. ` +
							`Action requise: approuver et traiter le remboursement, ou le rejeter/annuler.`,
						authorId: "system",
						authorName: "Systeme (cron reconcile-refunds)",
					},
				});
				staleAlerted++;
				tagsToInvalidate.add(ORDERS_CACHE_TAGS.NOTES(stale.orderId));
			} catch (noteError) {
				console.error(
					`[CRON:reconcile-refunds] Error creating note for stale refund ${stale.id}:`,
					noteError
				);
				errors++;
			}
		}
	}

	// Invalidate caches if any refunds were updated or alerted
	if (updated > 0 || staleAlerted > 0) {
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

	console.log(
		`[CRON:reconcile-refunds] Reconciliation completed: ${updated} updated, ${staleAlerted} stale alerted, ${errors} errors`
	);

	return {
		checked: pendingRefunds.length,
		updated,
		errors,
		staleAlerted,
		hasMore: pendingRefunds.length === BATCH_SIZE_MEDIUM || staleRefunds.length === BATCH_SIZE_MEDIUM,
	};
}
