import type Stripe from "stripe";
import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import { executePostWebhookTasks } from "@/modules/webhooks/utils/execute-post-tasks";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_LARGE,
	BATCH_SIZE_SMALL,
	MAX_WEBHOOK_RETRY_ATTEMPTS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";

/** Events stuck in PROCESSING longer than this are considered orphaned */
const PROCESSING_ORPHAN_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Recovers events stuck in PROCESSING status (orphaned by a crash).
 * Re-marks them as FAILED so they can be retried on the next run.
 */
async function recoverOrphanedProcessingEvents(): Promise<number> {
	const orphanThreshold = new Date(Date.now() - PROCESSING_ORPHAN_THRESHOLD_MS);

	// Find orphaned IDs in bounded batches to avoid unbounded updateMany
	const orphanedWithProcessedAt = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.PROCESSING,
			processedAt: { lt: orphanThreshold },
		},
		select: { id: true },
		take: BATCH_SIZE_LARGE,
	});

	const orphanedWithoutProcessedAt = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.PROCESSING,
			processedAt: null,
			receivedAt: { lt: orphanThreshold },
		},
		select: { id: true },
		take: BATCH_SIZE_LARGE,
	});

	const allIds = [
		...orphanedWithProcessedAt.map((e) => e.id),
		...orphanedWithoutProcessedAt.map((e) => e.id),
	];

	if (allIds.length === 0) return 0;

	const result = await prisma.webhookEvent.updateMany({
		where: { id: { in: allIds } },
		data: {
			status: WebhookEventStatus.FAILED,
			errorMessage: "Recovered from orphaned PROCESSING state",
		},
	});

	logger.warn("Recovered orphaned PROCESSING events", {
		cronJob: "retry-webhooks",
		count: result.count,
	});

	return result.count;
}

/**
 * Retries failed webhook events by re-fetching from Stripe.
 *
 * Webhooks can fail for transient reasons (timeouts, DB locks, etc.).
 * This cron re-fetches the event from Stripe's API and re-processes it.
 */
export async function retryFailedWebhooks(): Promise<{
	found: number;
	retried: number;
	succeeded: number;
	permanentlyFailed: number;
	errors: number;
	orphansRecovered: number;
	hasMore: boolean;
} | null> {
	logger.info("Starting failed webhook retry", { cronJob: "retry-webhooks" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.error("STRIPE_SECRET_KEY not configured", undefined, { cronJob: "retry-webhooks" });
		return null;
	}

	// Recovery phase: re-mark orphaned PROCESSING events as FAILED
	const orphansRecovered = await recoverOrphanedProcessingEvents();

	// Find FAILED webhooks under the max attempts limit,
	// processed more than 30 min ago (avoid retrying too frequently)
	const minAge = new Date(Date.now() - THRESHOLDS.WEBHOOK_RETRY_MIN_AGE_MS);

	const failedEvents = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.FAILED,
			attempts: { lt: MAX_WEBHOOK_RETRY_ATTEMPTS },
			processedAt: { lt: minAge },
		},
		orderBy: { receivedAt: "asc" },
		take: BATCH_SIZE_SMALL,
	});

	logger.info("Found failed events to retry", {
		cronJob: "retry-webhooks",
		count: failedEvents.length,
	});

	let retried = 0;
	let succeeded = 0;
	let permanentlyFailed = 0;
	let errors = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;

	for (const webhookEvent of failedEvents) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: "retry-webhooks" });
			break;
		}
		try {
			// Check if the event type is supported
			if (!isEventSupported(webhookEvent.eventType)) {
				logger.info("Skipping unsupported event type", {
					cronJob: "retry-webhooks",
					eventType: webhookEvent.eventType,
				});
				await prisma.webhookEvent.update({
					where: { id: webhookEvent.id },
					data: { status: WebhookEventStatus.SKIPPED },
				});
				continue;
			}

			// Re-fetch the event from Stripe
			let stripeEvent: Stripe.Event;
			try {
				stripeEvent = await stripe.events.retrieve(webhookEvent.stripeEventId);
			} catch {
				// Event no longer exists in Stripe (deleted after 30 days)
				logger.warn("Event not found in Stripe", {
					cronJob: "retry-webhooks",
					stripeEventId: webhookEvent.stripeEventId,
				});
				await prisma.webhookEvent.update({
					where: { id: webhookEvent.id },
					data: {
						status: WebhookEventStatus.SKIPPED,
						errorMessage: "Event not found in Stripe (expired)",
					},
				});
				continue;
			}

			// Optimistic lock: only claim if still FAILED (prevents double-processing)
			const claimed = await prisma.webhookEvent.updateMany({
				where: { id: webhookEvent.id, status: WebhookEventStatus.FAILED },
				data: {
					status: WebhookEventStatus.PROCESSING,
					attempts: { increment: 1 },
				},
			});
			if (claimed.count === 0) {
				logger.info("Event already claimed, skipping", {
					cronJob: "retry-webhooks",
					stripeEventId: webhookEvent.stripeEventId,
				});
				continue;
			}

			retried++;

			// Re-dispatch the event
			const result = await dispatchEvent(stripeEvent);

			// Mark as COMPLETED
			await prisma.webhookEvent.update({
				where: { id: webhookEvent.id },
				data: {
					status: WebhookEventStatus.COMPLETED,
					processedAt: new Date(),
					errorMessage: null,
				},
			});

			// Execute post-webhook tasks
			if (result?.tasks?.length) {
				await executePostWebhookTasks(result.tasks);
			}

			logger.info("Successfully retried event", {
				cronJob: "retry-webhooks",
				stripeEventId: webhookEvent.stripeEventId,
			});
			succeeded++;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// Fetch current attempts from DB (may have been incremented in the try block)
			const current = await prisma.webhookEvent.findUnique({
				where: { id: webhookEvent.id },
				select: { attempts: true, status: true },
			});

			// If the PROCESSING update didn't execute, increment attempts now
			const needsIncrement = current?.status !== WebhookEventStatus.PROCESSING;
			const newAttempts = needsIncrement
				? (current?.attempts ?? webhookEvent.attempts) + 1
				: current.attempts;
			const isPermanentlyFailed = newAttempts >= MAX_WEBHOOK_RETRY_ATTEMPTS;

			await prisma.webhookEvent.update({
				where: { id: webhookEvent.id },
				data: {
					status: WebhookEventStatus.FAILED,
					errorMessage,
					processedAt: new Date(),
					...(needsIncrement && { attempts: { increment: 1 } }),
				},
			});

			if (isPermanentlyFailed) {
				logger.error("Event permanently failed", error, {
					cronJob: "retry-webhooks",
					stripeEventId: webhookEvent.stripeEventId,
					attempts: newAttempts,
				});
				permanentlyFailed++;
			} else {
				logger.warn("Event retry failed", {
					cronJob: "retry-webhooks",
					stripeEventId: webhookEvent.stripeEventId,
					attempt: newAttempts,
					maxAttempts: MAX_WEBHOOK_RETRY_ATTEMPTS,
				});
				errors++;
			}
		}
	}

	logger.info("Retry completed", {
		cronJob: "retry-webhooks",
		retried,
		succeeded,
		permanentlyFailed,
		errors,
	});

	return {
		found: failedEvents.length,
		retried,
		succeeded,
		permanentlyFailed,
		errors,
		orphansRecovered,
		hasMore: failedEvents.length === BATCH_SIZE_SMALL,
	};
}
