import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

const COMPLETED_RETENTION_DAYS = 90; // Garder les events COMPLETED 90 jours
const FAILED_RETENTION_DAYS = 180; // Garder les events FAILED 180 jours (debug)

/**
 * Service de nettoyage des WebhookEvents anciens
 *
 * Supprime les événements webhook traités après leur période de rétention.
 * Les FAILED sont gardés plus longtemps pour le debugging.
 */
export async function cleanupOldWebhookEvents(): Promise<{
	completedDeleted: number;
	failedDeleted: number;
	skippedDeleted: number;
}> {
	console.log(
		"[CRON:cleanup-webhook-events] Starting webhook events cleanup..."
	);

	const completedExpiryDate = new Date(
		Date.now() - COMPLETED_RETENTION_DAYS * 24 * 60 * 60 * 1000
	);
	const failedExpiryDate = new Date(
		Date.now() - FAILED_RETENTION_DAYS * 24 * 60 * 60 * 1000
	);

	// 1. Supprimer les events COMPLETED de plus de 90 jours
	const completedResult = await prisma.webhookEvent.deleteMany({
		where: {
			status: WebhookEventStatus.COMPLETED,
			processedAt: { lt: completedExpiryDate },
		},
	});

	console.log(
		`[CRON:cleanup-webhook-events] Deleted ${completedResult.count} completed events`
	);

	// 2. Supprimer les events FAILED de plus de 180 jours
	const failedResult = await prisma.webhookEvent.deleteMany({
		where: {
			status: WebhookEventStatus.FAILED,
			processedAt: { lt: failedExpiryDate },
		},
	});

	console.log(
		`[CRON:cleanup-webhook-events] Deleted ${failedResult.count} failed events`
	);

	// 3. Supprimer les events SKIPPED de plus de 90 jours
	const skippedResult = await prisma.webhookEvent.deleteMany({
		where: {
			status: WebhookEventStatus.SKIPPED,
			receivedAt: { lt: completedExpiryDate },
		},
	});

	console.log(
		`[CRON:cleanup-webhook-events] Deleted ${skippedResult.count} skipped events`
	);

	console.log("[CRON:cleanup-webhook-events] Cleanup completed");

	return {
		completedDeleted: completedResult.count,
		failedDeleted: failedResult.count,
		skippedDeleted: skippedResult.count,
	};
}
