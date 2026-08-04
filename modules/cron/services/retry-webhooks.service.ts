import * as Sentry from "@sentry/nextjs";
import { Prisma, WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import { sendWebhookFailedAlert } from "@/modules/webhooks/services/alert.service";
import { executePostWebhookTasks } from "@/modules/webhooks/services/execute-post-webhook-tasks.service";
import {
	MAX_WEBHOOK_RETRY_ATTEMPTS,
	STALE_PROCESSING_THRESHOLD_MS,
} from "@/modules/webhooks/constants/webhook.constants";
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
 * Stale `PROCESSING` events older than `STALE_PROCESSING_THRESHOLD_MS` (15 min —
 * abaissé de 24h, WEBHOOK-AUDIT-001) are flipped back to `FAILED` so they become
 * eligible on a future run (recovers from crashed workers).
 *
 * Backoff: handled implicitly by an age filter of `WEBHOOK_RETRY_MIN_AGE_MS`
 * (30 minutes by default) on `processedAt`, with a `receivedAt` fallback for
 * events that never reached a terminal status (WEBHOOK-AUDIT-003). The cron runs
 * every 30 minutes so each retry happens at most once per cycle.
 */
export async function retryFailedWebhooks(): Promise<CronResult> {
	logger.info("Starting webhook retry", { cronJob: CRON_JOB });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.warn("STRIPE_SECRET_KEY not configured — skipping run", { cronJob: CRON_JOB });
		return {
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		};
	}

	// Reset stale PROCESSING events (worker crashed mid-flight) so they retry next time.
	// WEBHOOK-AUDIT-001 : seuil abaissé de 24h → STALE_PROCESSING_THRESHOLD_MS (15min,
	// bien au-delà du maxDuration=60s de la route) pour récupérer rapidement un event
	// figé par une lambda crashée.
	// WEBHOOK-AUDIT-002 : on filtre sur `processingStartedAt` (début du traitement
	// courant, (re)posé à chaque passage en PROCESSING) plutôt que `receivedAt`
	// (1ère réception) — sinon un event repris plusieurs fois resterait éligible au
	// reset sur sa date d'origine. Fallback `receivedAt` pour les lignes legacy
	// (processingStartedAt NULL écrites avant migration).
	const staleProcessingCutoff = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS);
	await prisma.webhookEvent.updateMany({
		where: {
			status: WebhookEventStatus.PROCESSING,
			OR: [
				{ processingStartedAt: { lt: staleProcessingCutoff } },
				{ processingStartedAt: null, receivedAt: { lt: staleProcessingCutoff } },
			],
		},
		data: { status: WebhookEventStatus.FAILED },
	});

	const minAge = new Date(Date.now() - THRESHOLDS.WEBHOOK_RETRY_MIN_AGE_MS);

	// WEBHOOK-AUDIT-003 : `processedAt` est NULL tant que l'event n'a jamais atteint un
	// statut terminal — c'est exactement le cas d'un event créé PROCESSING par la route
	// dont la lambda a crashé en plein dispatch (la branche `create` de l'upsert ne pose
	// pas `processedAt`). Le reset stale ci-dessus le bascule en FAILED sans y toucher, et
	// un filtre `processedAt: { lt: minAge }` seul l'EXCLUT (`NULL < date` vaut NULL en SQL,
	// jamais vrai) : l'event était réanimé puis plus jamais sélectionné, donc perdu
	// silencieusement — sans alerte, l'épuisement n'étant émis que par les `catch` de la
	// route et de ce cron. On reflète donc la clause OR du reset (fallback `receivedAt`,
	// toujours renseigné), ce qui rend au passage son usage à l'index [status, receivedAt].
	const candidates = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.FAILED,
			attempts: { lt: MAX_WEBHOOK_RETRY_ATTEMPTS },
			OR: [{ processedAt: { lt: minAge } }, { processedAt: null, receivedAt: { lt: minAge } }],
		},
		select: {
			id: true,
			stripeEventId: true,
			eventType: true,
			attempts: true,
		},
		// Tri sur `receivedAt` et non `processedAt` : en ASC Postgres place les NULL en
		// dernier, ce qui reléguerait en queue de batch les events jamais traités — les
		// plus à risque. `receivedAt` reflète l'âge réel et n'est jamais NULL.
		orderBy: { receivedAt: "asc" },
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

		// Throttle every call (uniform pacing, cap burst at 1/STRIPE_THROTTLE_MS req/s).
		await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));

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
					// WEBHOOK-AUDIT-002 : démarre l'horloge de fraîcheur de CE traitement.
					// Une redélivrance Stripe concurrente du même event verra ce PROCESSING
					// frais (processingStartedAt récent) et court-circuitera au lieu de
					// barger-in pendant que le cron dispatch encore.
					processingStartedAt: new Date(),
				},
			});
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
				skipped++;
				continue;
			}
			throw e;
		}

		// OPS-AUDIT-004 : back-pressure deadline guard right before the Stripe
		// call (which can hang up to STRIPE_TIMEOUT_MS=5s). Without this guard a
		// degraded Stripe could burn the whole BATCH_DEADLINE_MS=45s on
		// `events.retrieve` calls and the cron would return `hasMore: true`
		// without actually retrying any failed webhook on that page.
		if (Date.now() + STRIPE_TIMEOUT_MS > deadline) {
			logger.warn("Insufficient time for Stripe retrieve, stopping batch early", {
				cronJob: CRON_JOB,
				remainingMs: deadline - Date.now(),
			});
			// Revert the optimistic PROCESSING lock so the candidate is eligible next run.
			await prisma.webhookEvent.update({
				where: { id: candidate.id },
				data: {
					status: WebhookEventStatus.FAILED,
					attempts: { decrement: 1 },
				},
			});
			break;
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

			// Post-tasks exécutées EN DIRECT (Lot 2 S3.4 — plus de file durable) :
			// miroir de la finalisation côté route webhook. Un échec d'email est
			// alerté (admin + Sentry) par le runner, pas rejoué automatiquement.
			const tasks = result?.tasks ?? [];
			await prisma.webhookEvent.update({
				where: { id: candidate.id },
				data: {
					status: finalStatus,
					processedAt: new Date(),
				},
			});

			if (tasks.length > 0) {
				try {
					await executePostWebhookTasks(tasks);
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

			// Audit webhooks 2026-07-02 (F3) : l'email « max retries exhausted » n'était
			// émis que par la route (au 3ᵉ traitement live) — un event dont le dernier
			// échec survient DANS le cron sortait du filtre `attempts < MAX` et mourait
			// FAILED sans alerte admin. Best-effort ; l'idempotencyKey Resend
			// (`alert:webhook-failed:${eventId}`) dédoublonne avec l'alerte route (24h).
			if (candidate.attempts + 1 >= MAX_WEBHOOK_RETRY_ATTEMPTS) {
				try {
					await sendWebhookFailedAlert({
						eventId: candidate.stripeEventId,
						eventType: candidate.eventType,
						attempts: candidate.attempts + 1,
						error: message,
					});
				} catch (alertError) {
					logger.error("Failed to send webhook-exhausted admin alert", alertError, {
						cronJob: CRON_JOB,
						eventId: candidate.stripeEventId,
					});
				}
			}

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
