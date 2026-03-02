import { updateTag } from "next/cache";
import { RefundStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
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
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";

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
	logger.info("Starting refund reconciliation", { cronJob: "reconcile-refunds" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.error("STRIPE_SECRET_KEY not configured", undefined, { cronJob: "reconcile-refunds" });
		return null;
	}

	// Find APPROVED refunds with a stripeRefundId processed more than 1h ago
	// (give webhooks time to arrive first)
	const minAge = new Date(Date.now() - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS);

	const pendingRefunds = await prisma.refund.findMany({
		where: {
			status: RefundStatus.APPROVED,
			stripeRefundId: { not: null },
			// Include both processed refunds older than minAge AND
			// refunds with null processedAt (Stripe pending state) updated before minAge
			OR: [{ processedAt: { lt: minAge } }, { processedAt: null, updatedAt: { lt: minAge } }],
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

	logger.info("Found pending refunds to check", {
		cronJob: "reconcile-refunds",
		count: pendingRefunds.length,
	});

	let updated = 0;
	let errors = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const refund of pendingRefunds) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: "reconcile-refunds" });
			break;
		}
		if (!refund.stripeRefundId) continue;

		try {
			// Throttle to avoid Stripe rate limits
			if (updated > 0 || errors > 0) {
				await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
			}
			const stripeRefund = await stripe.refunds.retrieve(refund.stripeRefundId, {
				timeout: STRIPE_TIMEOUT_MS,
			});

			const newStatus = mapStripeRefundStatus(stripeRefund.status);

			// Update if status has changed
			if (newStatus !== refund.status) {
				if (newStatus === RefundStatus.COMPLETED) {
					await updateRefundStatus(
						refund.id,
						RefundStatus.COMPLETED,
						stripeRefund.status ?? "unknown",
					);
					logger.info("Refund marked as COMPLETED", {
						cronJob: "reconcile-refunds",
						refundId: refund.id,
					});
					tagsToInvalidate.add(ORDERS_CACHE_TAGS.REFUNDS(refund.orderId));
					updated++;
				} else if (newStatus === RefundStatus.FAILED) {
					const failureReason = stripeRefund.failure_reason ?? "Unknown failure";
					await markRefundAsFailed(refund.id, failureReason);
					sendRefundFailedAlert(refund, failureReason).catch((e) =>
						logger.error("Failed to send refund alert", e, { cronJob: "reconcile-refunds" }),
					);
					logger.info("Refund marked as FAILED", {
						cronJob: "reconcile-refunds",
						refundId: refund.id,
					});
					tagsToInvalidate.add(ORDERS_CACHE_TAGS.REFUNDS(refund.orderId));
					updated++;
				}
			}
		} catch (error) {
			logger.error("Error checking refund", error, {
				cronJob: "reconcile-refunds",
				refundId: refund.id,
			});
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
		logger.warn("Found stale refund(s) without Stripe ID", {
			cronJob: "reconcile-refunds",
			count: staleRefunds.length,
		});

		for (const stale of staleRefunds) {
			const ageHours = Math.round((Date.now() - stale.createdAt.getTime()) / (1000 * 60 * 60));
			logger.warn("Stale refund detected, admin action required", {
				cronJob: "reconcile-refunds",
				refundId: stale.id,
				status: stale.status,
				ageHours,
				orderNumber: stale.order.orderNumber,
				amountCents: stale.amount,
			});

			// Create an admin OrderNote to flag the stale refund (deduplicated)
			try {
				const existingNote = await prisma.orderNote.findFirst({
					where: {
						orderId: stale.orderId,
						content: { startsWith: `[REMBOURSEMENT ORPHELIN] Le remboursement ${stale.id}` },
					},
					select: { id: true },
				});

				if (existingNote) {
					logger.info("Note already exists for stale refund, skipping", {
						cronJob: "reconcile-refunds",
						refundId: stale.id,
					});
					continue;
				}

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
				logger.error("Error creating note for stale refund", noteError, {
					cronJob: "reconcile-refunds",
					refundId: stale.id,
				});
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

	logger.info("Reconciliation completed", {
		cronJob: "reconcile-refunds",
		updated,
		staleAlerted,
		errors,
	});

	return {
		checked: pendingRefunds.length,
		updated,
		errors,
		staleAlerted,
		hasMore:
			pendingRefunds.length === BATCH_SIZE_MEDIUM || staleRefunds.length === BATCH_SIZE_MEDIUM,
	};
}
