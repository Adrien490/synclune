import { updateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import {
	HistorySource,
	OrderAction,
	PaymentStatus,
	RefundStatus,
} from "@/app/generated/prisma/client";
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
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { sendRefundConfirmationOnce } from "@/modules/refunds/services/send-refund-confirmation.service";
import { recordRefundEReporting } from "@/modules/invoices/services/record-ereporting.service";
import { issueCreditNoteForRefund } from "@/modules/refunds/services/issue-credit-note.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

const RECONCILE_AUDIT_AUTHOR = "Système (reconcile-refunds)";

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
export async function reconcileRefunds(): Promise<CronResult> {
	logger.info("Starting refund reconciliation", { cronJob: "reconcile-refunds" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.warn("STRIPE_SECRET_KEY not configured — skipping run", {
			cronJob: "reconcile-refunds",
		});
		return {
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		};
	}

	// Scan window : 90 jours, avec au moins REFUND_RECONCILE_MIN_AGE_MS (1h) de
	// quarantine pour laisser le webhook path finaliser en premier.
	// EINV-CREDIT-009 : élargi 7j→90j pour couvrir les incidents production
	// prolongés (panne BDD, pause cron prolongée) où un Refund peut rester
	// stuck en APPROVED+stripeRefundId+processedAt=null pendant plusieurs
	// semaines sans rattrapage. Au-delà de 90j : procédure manuelle.
	const now = Date.now();
	const maxAge = new Date(now - 90 * 24 * 60 * 60 * 1000);
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
			// ORD-STRIPE-007 : reason + customerEmail/Name nécessaires pour
			// envoyer le mail confirmation client après finalisation DLQ.
			reason: true,
			attemptCount: true,
			order: {
				select: {
					id: true,
					orderNumber: true,
					total: true,
					userId: true,
					customerEmail: true,
					customerName: true,
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

	// EINV-CREDIT-009 : alerte Sentry P1 si on atteint le batch max — indique
	// soit un backlog anormal (incident production prolongé), soit un bug
	// systémique (webhook charge.refunded en panne durable). Cas normal : on
	// pick quelques unités/jour, jamais BATCH_SIZE_MEDIUM (=50).
	if (candidates.length === BATCH_SIZE_MEDIUM) {
		Sentry.withScope((scope) => {
			scope.setLevel("warning");
			scope.setTag("cron", "reconcile-refunds");
			scope.setTag("anomaly", "batch-saturated");
			scope.setFingerprint(["reconcile-refunds", "batch-saturated"]);
			scope.setContext("reconcile", {
				batchSize: BATCH_SIZE_MEDIUM,
				windowDays: 90,
			});
			Sentry.captureMessage(
				`reconcile-refunds picked ${BATCH_SIZE_MEDIUM} candidates (batch saturated — system anomaly)`,
				"warning",
			);
		});
	}

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
			// Throttle every call (uniform pacing, cap burst at 1/STRIPE_THROTTLE_MS req/s).
			await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));

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

					// E-reporting DGFiP (Phase 4 wiring, EINV-AUDIT-004).
					// L'admin path `processRefund` a déjà créé la transaction si
					// son Step 3 a réussi ; ici on rattrape le cas DLQ pur
					// (idempotence assurée par recordRefundEReporting).
					await recordRefundEReporting(refund.id);

					// EINV-CREDIT-001 : rattrapage avoir si l'admin path a abort
					// avant l'émission. Idempotent (noop si creditNoteNumber set).
					const creditNoteResult = await issueCreditNoteForRefund({
						refundId: refund.id,
						source: HistorySource.SYSTEM,
						authorName: RECONCILE_AUDIT_AUTHOR,
					});
					if (creditNoteResult.kind === "failed") {
						logger.warn(
							`reconcile-refunds — credit note emission failed for refund ${refund.id}: ${creditNoteResult.error}`,
							{ cronJob: "reconcile-refunds", refundId: refund.id },
						);
					}

					// ORD-STRIPE-005 : émetteur centralisé. Pose
					// `Refund.confirmationEmailSentAt` atomiquement — si admin SAGA
					// ou webhook `charge.refunded` a déjà envoyé, on skip silencieusement.
					if (refund.order.customerEmail) {
						const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refund.orderId));
						try {
							await sendRefundConfirmationOnce({
								refundId: refund.id,
								to: refund.order.customerEmail,
								orderNumber: refund.order.orderNumber,
								customerName: refund.order.customerName || "Client",
								refundAmount: refund.amount,
								reason: refund.reason,
								orderDetailsUrl,
								invoiceNumber: null,
								creditNoteNumber: null,
							});
						} catch (emailError) {
							logger.error(
								"Failed to send refund confirmation email after DLQ reconcile",
								emailError,
								{
									cronJob: "reconcile-refunds",
									refundId: refund.id,
									orderNumber: refund.order.orderNumber,
								},
							);
							// Non-bloquant : refund finalisé en DB, alerte admin
							// via Sentry mais cron continue.
							captureRefundError(emailError, {
								action: "reconcile-refunds-email",
								refundId: refund.id,
								stripeRefundId: refund.stripeRefundId,
								orderId: refund.orderId,
								orderNumber: refund.order.orderNumber,
							});
						}
					}
				} else {
					skipped++;
				}
			} else if (stripeRefund.status === "failed") {
				const failureReason = stripeRefund.failure_reason ?? "unknown";
				const failed = await prisma.$transaction(async (tx) => {
					const updated = await tx.refund.updateMany({
						where: { id: refund.id, status: RefundStatus.APPROVED },
						data: { status: RefundStatus.FAILED, failureReason },
					});
					if (updated.count === 0) return false;

					await createOrderAuditTx(tx, {
						orderId: refund.orderId,
						action: OrderAction.REFUND_FAILED,
						source: HistorySource.SYSTEM,
						authorName: RECONCILE_AUDIT_AUTHOR,
						note: `Refund failed via Stripe DLQ reconciliation (${failureReason})`,
						metadata: {
							refundId: refund.id,
							stripeRefundId: refund.stripeRefundId,
							amount: refund.amount,
							failureReason,
							reason: "stripe_dlq_reconcile",
						},
					});
					return true;
				});

				if (failed) {
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

		let newPaymentStatus: PaymentStatus | undefined;
		if (totalRefunded >= orderTotal) {
			newPaymentStatus = PaymentStatus.REFUNDED;
		} else if (totalRefunded > 0) {
			newPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
		}

		if (newPaymentStatus) {
			await tx.order.update({
				where: { id: orderId },
				data: { paymentStatus: newPaymentStatus },
			});
		}

		// Audit trail : conformité L123-22 + auditabilité du chemin DLQ. Sans
		// cette ligne, un refund finalisé via cron n'a aucune trace dans
		// OrderHistory contrairement aux refunds finalisés par webhook normal
		// ou action admin (drift invisible post-prod, impossible à expliquer
		// à un audit TVA).
		await createOrderAuditTx(tx, {
			orderId,
			action: OrderAction.REFUND_COMPLETED,
			source: HistorySource.SYSTEM,
			authorName: RECONCILE_AUDIT_AUTHOR,
			newPaymentStatus,
			note: "Refund completed via Stripe DLQ reconciliation",
			metadata: {
				refundId,
				refundAmount,
				totalRefunded,
				orderTotal,
				reason: "stripe_dlq_reconcile",
			},
		});

		return true;
	});
}
