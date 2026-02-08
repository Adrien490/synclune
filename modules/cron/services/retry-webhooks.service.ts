import type Stripe from "stripe";
import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getStripeClient } from "@/shared/lib/stripe";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import { executePostWebhookTasks } from "@/modules/webhooks/utils/execute-post-tasks";
import {
	BATCH_SIZE_SMALL,
	MAX_WEBHOOK_RETRY_ATTEMPTS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";

/** Events stuck in PROCESSING longer than this are considered orphaned */
const PROCESSING_ORPHAN_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Recover events stuck in PROCESSING status (orphaned by a crash).
 * Re-marks them as FAILED so they can be retried on the next run.
 */
async function recoverOrphanedProcessingEvents(): Promise<number> {
	const orphanThreshold = new Date(
		Date.now() - PROCESSING_ORPHAN_THRESHOLD_MS
	);

	const result = await prisma.webhookEvent.updateMany({
		where: {
			status: WebhookEventStatus.PROCESSING,
			processedAt: { lt: orphanThreshold },
		},
		data: {
			status: WebhookEventStatus.FAILED,
			errorMessage: "Recovered from orphaned PROCESSING state",
		},
	});

	// Also recover PROCESSING events with no processedAt (stuck before first update)
	const noProcessedAtResult = await prisma.webhookEvent.updateMany({
		where: {
			status: WebhookEventStatus.PROCESSING,
			processedAt: null,
			receivedAt: { lt: orphanThreshold },
		},
		data: {
			status: WebhookEventStatus.FAILED,
			errorMessage: "Recovered from orphaned PROCESSING state",
		},
	});

	const total = result.count + noProcessedAtResult.count;
	if (total > 0) {
		console.warn(
			`[CRON:retry-webhooks] Recovered ${total} orphaned PROCESSING events`
		);
	}

	return total;
}

/**
 * Service de retry des webhooks échoués
 *
 * Re-fetch les événements Stripe depuis l'API et les retraite.
 * Les webhooks peuvent échouer pour des raisons transitoires
 * (timeouts, locks DB, etc.).
 */
export async function retryFailedWebhooks(): Promise<{
	found: number;
	retried: number;
	succeeded: number;
	permanentlyFailed: number;
	errors: number;
	orphansRecovered: number;
} | null> {
	console.log("[CRON:retry-webhooks] Starting failed webhook retry...");

	const stripe = getStripeClient();
	if (!stripe) {
		console.error("[CRON:retry-webhooks] STRIPE_SECRET_KEY not configured");
		return null;
	}

	// Recovery phase: re-mark orphaned PROCESSING events as FAILED
	const orphansRecovered = await recoverOrphanedProcessingEvents();

	// Trouver les webhooks FAILED avec moins de MAX_WEBHOOK_RETRY_ATTEMPTS tentatives
	// et traités il y a plus de 30 minutes (éviter les retries trop fréquents)
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

	console.log(
		`[CRON:retry-webhooks] Found ${failedEvents.length} failed events to retry`
	);

	let retried = 0;
	let succeeded = 0;
	let permanentlyFailed = 0;
	let errors = 0;

	for (const webhookEvent of failedEvents) {
		try {
			// Vérifier si le type d'événement est supporté
			if (!isEventSupported(webhookEvent.eventType)) {
				console.log(
					`[CRON:retry-webhooks] Skipping unsupported event type: ${webhookEvent.eventType}`
				);
				await prisma.webhookEvent.update({
					where: { id: webhookEvent.id },
					data: { status: WebhookEventStatus.SKIPPED },
				});
				continue;
			}

			// Re-fetch l'événement depuis Stripe
			let stripeEvent: Stripe.Event;
			try {
				stripeEvent = await stripe.events.retrieve(webhookEvent.stripeEventId);
			} catch (fetchError) {
				// L'événement n'existe plus chez Stripe (supprimé après 30 jours)
				console.warn(
					`[CRON:retry-webhooks] Event ${webhookEvent.stripeEventId} not found in Stripe`
				);
				await prisma.webhookEvent.update({
					where: { id: webhookEvent.id },
					data: {
						status: WebhookEventStatus.SKIPPED,
						errorMessage: "Event not found in Stripe (expired)",
					},
				});
				continue;
			}

			// Marquer comme PROCESSING et incrémenter les tentatives
			await prisma.webhookEvent.update({
				where: { id: webhookEvent.id },
				data: {
					status: WebhookEventStatus.PROCESSING,
					attempts: { increment: 1 },
				},
			});

			retried++;

			// Re-dispatch l'événement
			const result = await dispatchEvent(stripeEvent);

			// Marquer comme COMPLETED
			await prisma.webhookEvent.update({
				where: { id: webhookEvent.id },
				data: {
					status: WebhookEventStatus.COMPLETED,
					processedAt: new Date(),
					errorMessage: null,
				},
			});

			// Exécuter les tâches post-webhook
			if (result?.tasks?.length) {
				await executePostWebhookTasks(result.tasks);
			}

			console.log(
				`[CRON:retry-webhooks] Successfully retried event ${webhookEvent.stripeEventId}`
			);
			succeeded++;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// Fetch current attempts from DB (may have been incremented in the try block)
			const current = await prisma.webhookEvent.findUnique({
				where: { id: webhookEvent.id },
				select: { attempts: true, status: true },
			});

			// If the PROCESSING update didn't execute, increment attempts now
			const needsIncrement =
				current?.status !== WebhookEventStatus.PROCESSING;
			const newAttempts = needsIncrement
				? (current?.attempts ?? webhookEvent.attempts) + 1
				: (current?.attempts ?? webhookEvent.attempts + 1);
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
				console.error(
					`[CRON:retry-webhooks] Event ${webhookEvent.stripeEventId} permanently failed after ${newAttempts} attempts`
				);
				permanentlyFailed++;
			} else {
				console.warn(
					`[CRON:retry-webhooks] Event ${webhookEvent.stripeEventId} retry failed (attempt ${newAttempts}/${MAX_WEBHOOK_RETRY_ATTEMPTS})`
				);
				errors++;
			}
		}
	}

	console.log(
		`[CRON:retry-webhooks] Retry completed: ${retried} retried, ${succeeded} succeeded, ${permanentlyFailed} permanently failed, ${errors} errors`
	);

	return {
		found: failedEvents.length,
		retried,
		succeeded,
		permanentlyFailed,
		errors,
		orphansRecovered,
	};
}
