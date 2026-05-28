import * as Sentry from "@sentry/nextjs";
import { OrderStatus, PaymentStatus, EReportingStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_SIZE_LARGE, THRESHOLDS } from "@/modules/cron/constants/limits";
import {
	sendAdminStuckOrdersAlert,
	sendAdminEReportingStuckAlert,
	sendAdminInvoiceFailedAlert,
} from "@/modules/emails/services/admin-emails";
import { getBaseUrl } from "@/shared/constants/urls";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const STUCK_INVOICE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours — défense en profondeur cron daily F4
const STUCK_EREPORTING_BATCH_MS = 48 * 60 * 60 * 1000; // 48h — audit monitoring 2026-05-28 EINV-OPS-010

const CRON_JOB = "alert-stuck-orders";

/**
 * Capture to Sentry when the admin alert email itself fails — the admin alert
 * IS the email, so a failed send is a dead-loop otherwise (no other channel
 * notifies the admin that they need to look at stuck orders).
 */
function captureEmailFailure(error: unknown, context: Record<string, unknown>): void {
	Sentry.withScope((scope) => {
		scope.setTag("cronJob", CRON_JOB);
		scope.setLevel("error");
		scope.setFingerprint(["cron", CRON_JOB, "email-failed"]);
		scope.setContext("stuckOrders", context);
		Sentry.captureException(error);
	});
}

interface StuckOrderRow {
	id: string;
	orderNumber: string;
	total: number;
	pivotDate: Date;
}

function toAlertItem(row: StuckOrderRow) {
	const ageDays = Math.floor((Date.now() - row.pivotDate.getTime()) / (24 * 60 * 60 * 1000));
	return { orderId: row.id, orderNumber: row.orderNumber, total: row.total, ageDays };
}

/**
 * Detects orders that have been stuck in operational states for too long
 * and emails the admin a single aggregated digest.
 *
 * Two windows are scanned:
 *  - status=PROCESSING + paymentStatus=PAID + paidAt < now - STUCK_PROCESSING_MS (7d)
 *  - status=SHIPPED + shippedAt < now - STUCK_SHIPPED_MS (14d) + actualDelivery IS NULL
 *
 * Read-only on the database: this cron does not mutate orders. The admin is
 * expected to follow up manually (chase supplier, contact courier, update
 * tracking, mark as delivered). Re-running weekly is intentional — if the
 * admin has not acted, repeated reminders are the desired behaviour.
 */
export async function alertStuckOrders(): Promise<CronResult> {
	const processingCutoff = new Date(Date.now() - THRESHOLDS.STUCK_PROCESSING_MS);
	const shippedCutoff = new Date(Date.now() - THRESHOLDS.STUCK_SHIPPED_MS);
	const invoiceStuckCutoff = new Date(Date.now() - STUCK_INVOICE_MS);
	const ereportingStuckCutoff = new Date(Date.now() - STUCK_EREPORTING_BATCH_MS);

	const [processingRaw, shippedRaw, invoiceStuckRaw, ereportingStuckRaw] = await Promise.all([
		prisma.order.findMany({
			where: {
				status: OrderStatus.PROCESSING,
				paymentStatus: PaymentStatus.PAID,
				paidAt: { lt: processingCutoff, not: null },
				...notDeleted,
			},
			select: { id: true, orderNumber: true, total: true, paidAt: true },
			take: BATCH_SIZE_LARGE,
			orderBy: { paidAt: "asc" },
		}),
		prisma.order.findMany({
			where: {
				status: OrderStatus.SHIPPED,
				shippedAt: { lt: shippedCutoff, not: null },
				actualDelivery: null,
				...notDeleted,
			},
			select: { id: true, orderNumber: true, total: true, shippedAt: true },
			take: BATCH_SIZE_LARGE,
			orderBy: { shippedAt: "asc" },
		}),
		// Audit monitoring 2026-05-28 EINV-OPS-011 : factures bloquées 7j (filet
		// hebdo redondant du cron daily reconcile-invoices F4).
		prisma.order.findMany({
			where: {
				paymentStatus: PaymentStatus.PAID,
				invoiceNumber: null,
				paidAt: { lt: invoiceStuckCutoff, not: null },
				...notDeleted,
			},
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				total: true,
				stripePaymentIntentId: true,
				paidAt: true,
			},
			take: BATCH_SIZE_LARGE,
			orderBy: { paidAt: "asc" },
		}),
		// EINV-OPS-010 + EINV-EREPORT-004 : batches e-reporting bloqués > 48h.
		// REJECTED inclus : un rejet PA n'est jamais re-tenté automatiquement et
		// reste non transmis à la DGFiP jusqu'à action admin (retryEReportingBatch).
		// ABANDONED inclus (EINV-CRON-005) : épuisement des retries = données fiscales
		// définitivement non transmises ; le Sentry one-shot émis à l'abandon peut
		// être manqué → rappel hebdo idempotent indispensable.
		prisma.eReportingBatch.findMany({
			where: {
				status: {
					in: [
						EReportingStatus.PENDING,
						EReportingStatus.RETRYING,
						EReportingStatus.REJECTED,
						EReportingStatus.ABANDONED,
					],
				},
				createdAt: { lt: ereportingStuckCutoff },
			},
			select: { id: true, status: true, createdAt: true },
			take: BATCH_SIZE_LARGE,
			orderBy: { createdAt: "asc" },
		}),
	]);

	const processingOrders = processingRaw
		.filter((o): o is typeof o & { paidAt: Date } => o.paidAt !== null)
		.map((o) => toAlertItem({ ...o, pivotDate: o.paidAt }));

	const shippedOrders = shippedRaw
		.filter((o): o is typeof o & { shippedAt: Date } => o.shippedAt !== null)
		.map((o) => toAlertItem({ ...o, pivotDate: o.shippedAt }));

	const totalStuck = processingOrders.length + shippedOrders.length;
	const invoiceStuckCount = invoiceStuckRaw.length;
	const ereportingStuckCount = ereportingStuckRaw.length;

	logger.info("Stuck orders scan completed", {
		cronJob: CRON_JOB,
		processingCount: processingOrders.length,
		shippedCount: shippedOrders.length,
		totalStuck,
		invoiceStuckCount,
		ereportingStuckCount,
	});

	let errored = 0;

	if (totalStuck > 0) {
		const alertContext = {
			processingCount: processingOrders.length,
			shippedCount: shippedOrders.length,
			totalStuck,
		};
		try {
			const result = await sendAdminStuckOrdersAlert({ processingOrders, shippedOrders });
			if (!result.success) {
				errored++;
				logger.error("Failed to send stuck orders alert", undefined, {
					cronJob: CRON_JOB,
					error: result.error,
				});
				captureEmailFailure(
					result.error instanceof Error
						? result.error
						: new Error(
								typeof result.error === "string" ? result.error : "Resend returned failure",
							),
					alertContext,
				);
			}
		} catch (error) {
			errored++;
			logger.error("Exception sending stuck orders alert", error, { cronJob: CRON_JOB });
			captureEmailFailure(error, alertContext);
		}
	}

	// Re-emit per-order invoice alerts. `idempotencyKey` Resend (24h) garantit
	// que les emails non-traités par l'admin du cron précédent sont dedupliqués.
	for (const order of invoiceStuckRaw) {
		try {
			await sendAdminInvoiceFailedAlert({
				orderId: order.id,
				orderNumber: order.orderNumber,
				customerEmail: order.customerEmail,
				amount: order.total,
				errorMessage: "Détectée par cron alert-stuck-orders (facture absente > 7j post-paiement)",
				stripePaymentIntentId: order.stripePaymentIntentId ?? undefined,
				dashboardUrl: `${getBaseUrl()}/admin/ventes/commandes/${order.id}`,
			});
		} catch (error) {
			errored++;
			logger.error("Failed to send weekly invoice stuck reminder", error, {
				cronJob: CRON_JOB,
				orderId: order.id,
			});
		}
	}

	if (ereportingStuckCount > 0) {
		try {
			const stuckBatches = ereportingStuckRaw.map((b) => ({
				id: b.id,
				status: b.status,
				ageHours: Math.floor((Date.now() - b.createdAt.getTime()) / (60 * 60 * 1000)),
			}));
			const result = await sendAdminEReportingStuckAlert({ stuckBatches });
			if (!result.success) {
				errored++;
				logger.error("Failed to send e-reporting stuck alert", undefined, {
					cronJob: CRON_JOB,
					error: result.error,
				});
			}
		} catch (error) {
			errored++;
			logger.error("Exception sending e-reporting stuck alert", error, { cronJob: CRON_JOB });
		}
	}

	const processedItems = totalStuck + invoiceStuckCount + ereportingStuckCount;
	return {
		processed: errored === 0 ? processedItems : 0,
		errored,
		skipped: 0,
		processingStuck: processingOrders.length,
		shippedStuck: shippedOrders.length,
		invoiceStuck: invoiceStuckCount,
		ereportingStuck: ereportingStuckCount,
	};
}
