import * as Sentry from "@sentry/nextjs";
import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_SIZE_LARGE, THRESHOLDS } from "@/modules/cron/constants/limits";
import { sendAdminStuckOrdersAlert } from "@/modules/emails/services/admin-emails";
import type { CronResult } from "@/modules/cron/lib/cron-result";

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

	const [processingRaw, shippedRaw] = await Promise.all([
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
	]);

	const processingOrders = processingRaw
		.filter((o): o is typeof o & { paidAt: Date } => o.paidAt !== null)
		.map((o) => toAlertItem({ ...o, pivotDate: o.paidAt }));

	const shippedOrders = shippedRaw
		.filter((o): o is typeof o & { shippedAt: Date } => o.shippedAt !== null)
		.map((o) => toAlertItem({ ...o, pivotDate: o.shippedAt }));

	const totalStuck = processingOrders.length + shippedOrders.length;

	logger.info("Stuck orders scan completed", {
		cronJob: "alert-stuck-orders",
		processingCount: processingOrders.length,
		shippedCount: shippedOrders.length,
		totalStuck,
	});

	if (totalStuck === 0) {
		return {
			processed: 0,
			errored: 0,
			skipped: 0,
			processingStuck: 0,
			shippedStuck: 0,
		};
	}

	let errored = 0;
	const alertContext = {
		processingCount: processingOrders.length,
		shippedCount: shippedOrders.length,
		totalStuck,
	};
	try {
		const result = await sendAdminStuckOrdersAlert({ processingOrders, shippedOrders });
		if (!result.success) {
			errored = 1;
			logger.error("Failed to send stuck orders alert", undefined, {
				cronJob: CRON_JOB,
				error: result.error,
			});
			captureEmailFailure(
				result.error instanceof Error
					? result.error
					: new Error(typeof result.error === "string" ? result.error : "Resend returned failure"),
				alertContext,
			);
		}
	} catch (error) {
		errored = 1;
		logger.error("Exception sending stuck orders alert", error, {
			cronJob: CRON_JOB,
		});
		captureEmailFailure(error, alertContext);
	}

	return {
		processed: errored === 0 ? totalStuck : 0,
		errored,
		skipped: 0,
		processingStuck: processingOrders.length,
		shippedStuck: shippedOrders.length,
	};
}
