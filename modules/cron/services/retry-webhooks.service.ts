import * as Sentry from "@sentry/nextjs";
import { Prisma, WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import { executePostWebhookTasks } from "@/modules/webhooks/utils/execute-post-tasks";
import { MAX_WEBHOOK_RETRY_ATTEMPTS } from "@/modules/webhooks/constants/webhook.constants";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "retry-webhooks";

/**
 * Retries FAILED webhook events whose `attempts` is below the maximum
 * threshold and that have aged past the retry backoff window.
 *
 * Each candidate is locked optimistically (status + attempts in WHERE) to
 * prevent two cron runs from re-processing the same event. The Stripe event
 * payload is refetched from Stripe (source of truth) and re-dispatched
 * through the same handler used by the live webhook route.
 *
 * Stale `PROCESSING` events older than 24h are flipped back to `FAILED` so
 * they become eligible on a future run (recovers from crashed workers).
 *
 * Backoff: handled implicitly by `processedAt < now - WEBHOOK_RETRY_MIN_AGE_MS`
 * — events older than 30 minutes (default) are eligible. The cron runs every
 * 30 minutes so each retry happens at most once per cycle.
 */
export async function retryFailedWebhooks(): Promise<CronResult | null> {
	logger.info("Starting webhook retry", { cronJob: CRON_JOB });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.error("STRIPE_SECRET_KEY not configured", undefined, { cronJob: CRON_JOB });
		return null;
	}

	// Reset stale PROCESSING events (worker crashed mid-flight) so they retry next time
	const staleProcessingCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
	await prisma.webhookEvent.updateMany({
		where: {
			status: WebhookEventStatus.PROCESSING,
			processedAt: { lt: staleProcessingCutoff },
		},
		data: { status: WebhookEventStatus.FAILED },
	});

	const minAge = new Date(Date.now() - THRESHOLDS.WEBHOOK_RETRY_MIN_AGE_MS);

	const candidates = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.FAILED,
			attempts: { lt: MAX_WEBHOOK_RETRY_ATTEMPTS },
			processedAt: { lt: minAge },
		},
		select: {
			id: true,
			stripeEventId: true,
			eventType: true,
			attempts: true,
		},
		orderBy: { processedAt: "asc" },
		take: BATCH_SIZE_MEDIUM,
	});

	logger.info("Found webhook events to retry", { cronJob: CRON_JOB, count: candidates.length });

	const deadline = Date.now() + BATCH_DEADLINE_MS;
	let processed = 0;
	let errored = 0;
	let skipped = 0;

	for (const candidate of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: CRON_JOB });
			break;
		}

		// Throttle Stripe calls (rate limit 100 req/s) — skip first iteration
		if (processed > 0 || errored > 0 || skipped > 0) {
			await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
		}

		// Atomic lock: only this cron picks the row up. P2025 if another worker raced.
		try {
			await prisma.webhookEvent.update({
				where: {
					id: candidate.id,
					status: WebhookEventStatus.FAILED,
					attempts: candidate.attempts,
				},
				data: {
					status: WebhookEventStatus.PROCESSING,
					attempts: { increment: 1 },
				},
			});
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
				skipped++;
				continue;
			}
			throw e;
		}

		try {
			const stripeEvent = await stripe.events.retrieve(candidate.stripeEventId, undefined, {
				timeout: STRIPE_TIMEOUT_MS,
			});

			if (!isEventSupported(stripeEvent.type)) {
				await prisma.webhookEvent.update({
					where: { id: candidate.id },
					data: {
						status: WebhookEventStatus.SKIPPED,
						processedAt: new Date(),
						errorMessage: null,
					},
				});
				skipped++;
				continue;
			}

			const result = await Sentry.startSpan(
				{ name: `webhook.retry.${stripeEvent.type}`, op: "webhook" },
				() => dispatchEvent(stripeEvent),
			);

			const finalStatus = result?.skipped
				? WebhookEventStatus.SKIPPED
				: WebhookEventStatus.COMPLETED;

			await prisma.webhookEvent.update({
				where: { id: candidate.id },
				data: {
					status: finalStatus,
					processedAt: new Date(),
					errorMessage: null,
				},
			});

			if (result?.tasks?.length) {
				try {
					await executePostWebhookTasks(result.tasks);
				} catch (e) {
					logger.warn("Post-webhook tasks failed during retry", {
						cronJob: CRON_JOB,
						eventId: candidate.stripeEventId,
						error: e instanceof Error ? e.message : String(e),
					});
				}
			}

			processed++;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			await prisma.webhookEvent.update({
				where: { id: candidate.id },
				data: {
					status: WebhookEventStatus.FAILED,
					errorMessage: message,
					processedAt: new Date(),
				},
			});

			Sentry.withScope((scope) => {
				scope.setTag("cronJob", CRON_JOB);
				scope.setTag("eventType", candidate.eventType);
				scope.setLevel("error");
				scope.setFingerprint([CRON_JOB, candidate.eventType]);
				scope.setContext("webhookRetry", {
					stripeEventId: candidate.stripeEventId,
					attempts: candidate.attempts + 1,
				});
				Sentry.captureException(error instanceof Error ? error : new Error(message));
			});

			errored++;
		}
	}

	logger.info("Webhook retry completed", {
		cronJob: CRON_JOB,
		processed,
		errored,
		skipped,
	});

	return {
		processed,
		errored,
		skipped,
		candidates: candidates.length,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
	};
}
