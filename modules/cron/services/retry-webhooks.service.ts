import Stripe from "stripe";
import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import { executePostWebhookTasks } from "@/modules/webhooks/utils/execute-post-tasks";

const MAX_RETRY_ATTEMPTS = 3;

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
}> {
	console.log("[CRON:retry-webhooks] Starting failed webhook retry...");

	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

	// Trouver les webhooks FAILED avec moins de MAX_RETRY_ATTEMPTS tentatives
	// et traités il y a plus de 30 minutes (éviter les retries trop fréquents)
	const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

	const failedEvents = await prisma.webhookEvent.findMany({
		where: {
			status: WebhookEventStatus.FAILED,
			attempts: { lt: MAX_RETRY_ATTEMPTS },
			processedAt: { lt: thirtyMinutesAgo },
		},
		orderBy: { receivedAt: "asc" },
		take: 10, // Limiter pour éviter timeout
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

			// Vérifier si on a atteint le max de tentatives
			const newAttempts = webhookEvent.attempts + 1;
			const isPermanentlyFailed = newAttempts >= MAX_RETRY_ATTEMPTS;

			await prisma.webhookEvent.update({
				where: { id: webhookEvent.id },
				data: {
					status: isPermanentlyFailed
						? WebhookEventStatus.FAILED
						: WebhookEventStatus.FAILED,
					errorMessage,
					processedAt: new Date(),
				},
			});

			if (isPermanentlyFailed) {
				console.error(
					`[CRON:retry-webhooks] Event ${webhookEvent.stripeEventId} permanently failed after ${newAttempts} attempts`
				);
				permanentlyFailed++;
			} else {
				console.warn(
					`[CRON:retry-webhooks] Event ${webhookEvent.stripeEventId} retry failed (attempt ${newAttempts}/${MAX_RETRY_ATTEMPTS})`
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
	};
}
