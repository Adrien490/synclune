import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { CLEANUP_DELETE_LIMIT, RETENTION } from "@/modules/cron/constants/limits";

/**
 * Cleans up old webhook events past their retention period,
 * and resolved FailedEmail records older than 30 days.
 *
 * COMPLETED/SKIPPED events are deleted after 90 days.
 * FAILED events are kept longer (180 days) for debugging.
 * Stale PROCESSING/PENDING events are cleaned as stragglers.
 * RETRIED/EXHAUSTED FailedEmail records are deleted after 30 days.
 */
export async function cleanupOldWebhookEvents(): Promise<{
	completedDeleted: number;
	failedDeleted: number;
	skippedDeleted: number;
	staleDeleted: number;
	failedEmailsDeleted: number;
}> {
	console.log(
		"[CRON:cleanup-webhook-events] Starting webhook events cleanup..."
	);

	const completedExpiryDate = new Date(
		Date.now() - RETENTION.WEBHOOK_COMPLETED_DAYS * 24 * 60 * 60 * 1000
	);
	const failedExpiryDate = new Date(
		Date.now() - RETENTION.WEBHOOK_FAILED_DAYS * 24 * 60 * 60 * 1000
	);

	// 1. Delete COMPLETED events older than 90 days (bounded)
	const completedToDelete = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.COMPLETED,
			processedAt: { lt: completedExpiryDate },
		},
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const completedResult = await prisma.webhookEvent.deleteMany({
		where: { id: { in: completedToDelete.map((e) => e.id) } },
	});

	console.log(
		`[CRON:cleanup-webhook-events] Deleted ${completedResult.count} completed events`
	);

	if (completedToDelete.length === CLEANUP_DELETE_LIMIT) {
		console.warn(
			"[CRON:cleanup-webhook-events] Completed events delete limit reached, remaining will be cleaned on next run"
		);
	}

	// 2. Delete FAILED events older than 180 days (bounded)
	const failedToDelete = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.FAILED,
			processedAt: { lt: failedExpiryDate },
		},
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const failedResult = await prisma.webhookEvent.deleteMany({
		where: { id: { in: failedToDelete.map((e) => e.id) } },
	});

	console.log(
		`[CRON:cleanup-webhook-events] Deleted ${failedResult.count} failed events`
	);

	// 3. Delete SKIPPED events older than 90 days (bounded)
	const skippedToDelete = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.SKIPPED,
			receivedAt: { lt: completedExpiryDate },
		},
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const skippedResult = await prisma.webhookEvent.deleteMany({
		where: { id: { in: skippedToDelete.map((e) => e.id) } },
	});

	console.log(
		`[CRON:cleanup-webhook-events] Deleted ${skippedResult.count} skipped events`
	);

	// 4. Delete stale PROCESSING/PENDING events older than 90 days (bounded)
	// These should not exist: PROCESSING events are recovered by retry-webhooks,
	// and PENDING events should be processed quickly. Clean up any stragglers.
	const staleExpiryDate = new Date(
		Date.now() - RETENTION.WEBHOOK_STALE_DAYS * 24 * 60 * 60 * 1000
	);

	const staleToDelete = await prisma.webhookEvent.findMany({
		where: {
			status: {
				in: [
					WebhookEventStatus.PROCESSING,
					WebhookEventStatus.PENDING,
				],
			},
			receivedAt: { lt: staleExpiryDate },
		},
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const staleResult = await prisma.webhookEvent.deleteMany({
		where: { id: { in: staleToDelete.map((e) => e.id) } },
	});

	if (staleResult.count > 0) {
		console.warn(
			`[CRON:cleanup-webhook-events] Deleted ${staleResult.count} stale PROCESSING/PENDING events`
		);
	}

	// 5. Delete resolved FailedEmail records older than 30 days (bounded)
	// RETRIED = successfully resent, EXHAUSTED = gave up after max retries
	const failedEmailExpiryDate = new Date(
		Date.now() - RETENTION.FAILED_EMAIL_RESOLVED_DAYS * 24 * 60 * 60 * 1000
	);

	const failedEmailResult = await prisma.failedEmail.deleteMany({
		where: {
			status: { in: ["RETRIED", "EXHAUSTED"] },
			updatedAt: { lt: failedEmailExpiryDate },
		},
	});

	if (failedEmailResult.count > 0) {
		console.log(
			`[CRON:cleanup-webhook-events] Deleted ${failedEmailResult.count} resolved FailedEmail records`
		);
	}

	console.log("[CRON:cleanup-webhook-events] Cleanup completed");

	return {
		completedDeleted: completedResult.count,
		failedDeleted: failedResult.count,
		skippedDeleted: skippedResult.count,
		staleDeleted: staleResult.count,
		failedEmailsDeleted: failedEmailResult.count,
	};
}
