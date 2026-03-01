import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { CLEANUP_DELETE_LIMIT, RETENTION } from "@/modules/cron/constants/limits";

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
	logger.info("Starting webhook events cleanup", { cronJob: "cleanup-webhook-events" });

	const completedExpiryDate = new Date(
		Date.now() - RETENTION.WEBHOOK_COMPLETED_DAYS * 24 * 60 * 60 * 1000,
	);
	const failedExpiryDate = new Date(
		Date.now() - RETENTION.WEBHOOK_FAILED_DAYS * 24 * 60 * 60 * 1000,
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

	logger.info("Deleted completed events", {
		cronJob: "cleanup-webhook-events",
		count: completedResult.count,
	});

	if (completedToDelete.length === CLEANUP_DELETE_LIMIT) {
		logger.warn("Completed events delete limit reached, remaining will be cleaned on next run", {
			cronJob: "cleanup-webhook-events",
		});
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

	logger.info("Deleted failed events", {
		cronJob: "cleanup-webhook-events",
		count: failedResult.count,
	});

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

	logger.info("Deleted skipped events", {
		cronJob: "cleanup-webhook-events",
		count: skippedResult.count,
	});

	// 4. Delete stale PROCESSING/PENDING events older than 90 days (bounded)
	// These should not exist: PROCESSING events are recovered by retry-webhooks,
	// and PENDING events should be processed quickly. Clean up any stragglers.
	const staleExpiryDate = new Date(Date.now() - RETENTION.WEBHOOK_STALE_DAYS * 24 * 60 * 60 * 1000);

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

	if (staleResult.count > 0) {
		logger.warn("Deleted stale PROCESSING/PENDING events", {
			cronJob: "cleanup-webhook-events",
			count: staleResult.count,
		});
	}

	logger.info("Cleanup completed", { cronJob: "cleanup-webhook-events" });

	return {
		completedDeleted: completedResult.count,
		failedDeleted: failedResult.count,
		skippedDeleted: skippedResult.count,
		staleDeleted: staleResult.count,
		hasMore:
			completedToDelete.length === CLEANUP_DELETE_LIMIT ||
			failedToDelete.length === CLEANUP_DELETE_LIMIT ||
			skippedToDelete.length === CLEANUP_DELETE_LIMIT ||
			staleToDelete.length === CLEANUP_DELETE_LIMIT,
	};
}
