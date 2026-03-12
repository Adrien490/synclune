import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import {
	CLEANUP_DELETE_LIMIT,
	RETENTION,
	BATCH_DEADLINE_MS,
} from "@/modules/cron/constants/limits";

const CRON_JOB = "cleanup-webhook-events";

/**
 * Cleans up old webhook events past their retention period.
 *
 * COMPLETED/SKIPPED events are deleted after 90 days.
 * FAILED events are kept longer (180 days) for debugging.
 * Stale PROCESSING/PENDING events are cleaned as stragglers.
 */
export async function cleanupOldWebhookEvents(): Promise<{
	completedDeleted: number;
	failedDeleted: number;
	skippedDeleted: number;
	staleDeleted: number;
	hasMore: boolean;
}> {
	logger.info("Starting webhook events cleanup", { cronJob: CRON_JOB });

	const batchStart = Date.now();
	const completedExpiryDate = new Date(
		Date.now() - RETENTION.WEBHOOK_COMPLETED_DAYS * 24 * 60 * 60 * 1000,
	);
	const failedExpiryDate = new Date(
		Date.now() - RETENTION.WEBHOOK_FAILED_DAYS * 24 * 60 * 60 * 1000,
	);

	let completedDeleted = 0;
	let failedDeleted = 0;
	let skippedDeleted = 0;
	let staleDeleted = 0;
	let hasMoreCompleted = false;
	let hasMoreFailed = false;
	let hasMoreSkipped = false;
	let hasMoreStale = false;

	// 1. Delete COMPLETED events older than 90 days (bounded)
	try {
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

		completedDeleted = completedResult.count;
		hasMoreCompleted = completedToDelete.length === CLEANUP_DELETE_LIMIT;

		logger.info("Deleted completed events", { cronJob: CRON_JOB, count: completedDeleted });

		if (hasMoreCompleted) {
			logger.warn("Completed events delete limit reached, remaining will be cleaned on next run", {
				cronJob: CRON_JOB,
			});
		}
	} catch (error) {
		logger.error("Error deleting completed events", error, { cronJob: CRON_JOB });
	}

	// 2. Delete FAILED events older than 180 days (bounded)
	if (Date.now() - batchStart < BATCH_DEADLINE_MS) {
		try {
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

			failedDeleted = failedResult.count;
			hasMoreFailed = failedToDelete.length === CLEANUP_DELETE_LIMIT;

			logger.info("Deleted failed events", { cronJob: CRON_JOB, count: failedDeleted });
		} catch (error) {
			logger.error("Error deleting failed events", error, { cronJob: CRON_JOB });
		}
	}

	// 3. Delete SKIPPED events older than 90 days (bounded)
	if (Date.now() - batchStart < BATCH_DEADLINE_MS) {
		try {
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

			skippedDeleted = skippedResult.count;
			hasMoreSkipped = skippedToDelete.length === CLEANUP_DELETE_LIMIT;

			logger.info("Deleted skipped events", { cronJob: CRON_JOB, count: skippedDeleted });
		} catch (error) {
			logger.error("Error deleting skipped events", error, { cronJob: CRON_JOB });
		}
	}

	// 4. Delete stale PROCESSING/PENDING events older than 90 days (bounded)
	// These should not exist: PROCESSING events are recovered by retry-webhooks,
	// and PENDING events should be processed quickly. Clean up any stragglers.
	if (Date.now() - batchStart < BATCH_DEADLINE_MS) {
		try {
			const staleExpiryDate = new Date(
				Date.now() - RETENTION.WEBHOOK_STALE_DAYS * 24 * 60 * 60 * 1000,
			);

			const staleToDelete = await prisma.webhookEvent.findMany({
				where: {
					status: {
						in: [WebhookEventStatus.PROCESSING, WebhookEventStatus.PENDING],
					},
					receivedAt: { lt: staleExpiryDate },
				},
				select: { id: true },
				take: CLEANUP_DELETE_LIMIT,
			});

			const staleResult = await prisma.webhookEvent.deleteMany({
				where: { id: { in: staleToDelete.map((e) => e.id) } },
			});

			staleDeleted = staleResult.count;
			hasMoreStale = staleToDelete.length === CLEANUP_DELETE_LIMIT;

			if (staleDeleted > 0) {
				logger.warn("Deleted stale PROCESSING/PENDING events", {
					cronJob: CRON_JOB,
					count: staleDeleted,
				});
			}
		} catch (error) {
			logger.error("Error deleting stale events", error, { cronJob: CRON_JOB });
		}
	}

	logger.info("Cleanup completed", { cronJob: CRON_JOB });

	return {
		completedDeleted,
		failedDeleted,
		skippedDeleted,
		staleDeleted,
		hasMore: hasMoreCompleted || hasMoreFailed || hasMoreSkipped || hasMoreStale,
	};
}
