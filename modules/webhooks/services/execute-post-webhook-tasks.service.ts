import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import { revalidateTagsInBackground } from "@/shared/lib/cache";
import { sendWebhookFailedAlertEmail } from "@/modules/emails/services/admin-emails";
import { CRITICAL_EMAIL_TASKS, dispatchEmailTask } from "../utils/dispatch-email-task";
import type { PostWebhookTask } from "../types/webhook.types";

export interface PostWebhookTaskStats {
	successful: number;
	failed: number;
}

/**
 * Exécute les tâches post-webhook EN DIRECT — Lot 2 SIMPLIFICATION.md (S3.4).
 *
 * Remplace la file durable `PostWebhookTask` (persist + claim atomique + backoff
 * + cron de rejeu) : à ~20 commandes/mois, le scénario qu'elle couvrait — crash
 * de la lambda entre le 200 renvoyé à Stripe et l'envoi d'email — se rattrape à
 * la main. Filets restants :
 *  - dédup : clé d'idempotence Resend 24 h (`order-confirm-<id>`,
 *    `refund-confirm-<id>`) + claim `Refund.confirmationEmailSentAt` — les mêmes
 *    qui neutralisaient déjà les doubles envois de la file ;
 *  - échec d'un email critique → alerte admin + Sentry, puis renvoi manuel
 *    (`resend-order-email`) ou bouton `reconcile-refunds` de la page Maintenance ;
 *  - invalidation de cache : `revalidateTagsInBackground` immédiat — un tag non
 *    invalidé expire de toute façon avec son profil de cache.
 *
 * Chaque tâche est isolée dans son propre try/catch : un email en échec ne
 * bloque ni les autres envois ni l'invalidation.
 */
export async function executePostWebhookTasks(
	tasks: PostWebhookTask[],
): Promise<PostWebhookTaskStats> {
	const stats: PostWebhookTaskStats = { successful: 0, failed: 0 };
	const criticalFailures: Array<{ type: string; error: string }> = [];

	for (const task of tasks) {
		try {
			if (task.type === "INVALIDATE_CACHE") {
				// Contexte route handler / cron / after() ⇒ `revalidateTag`, jamais
				// `updateTag` (E872 — cf. matrice contexte→API de CLAUDE.md).
				revalidateTagsInBackground(task.tags);
			} else {
				await dispatchEmailTask(task);
			}
			stats.successful++;
		} catch (error) {
			stats.failed++;
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(`[WEBHOOK-POSTTASK] Failed to execute ${task.type}:`, error, {
				service: "webhook",
			});
			Sentry.captureException(error, {
				tags: { scope: "post-webhook-task", taskType: task.type },
			});
			if (CRITICAL_EMAIL_TASKS.has(task.type)) {
				criticalFailures.push({ type: task.type, error: errorMessage });
			}
		}
	}

	if (criticalFailures.length > 0) {
		try {
			await sendWebhookFailedAlertEmail({
				eventId: "post-task-email-failure",
				eventType: criticalFailures.map((f) => f.type).join(", "),
				attempts: 1,
				error: criticalFailures.map((f) => `${f.type}: ${f.error}`).join("; "),
			});
		} catch {
			logger.error(
				"[WEBHOOK-POSTTASK] Failed to send admin alert for failed email tasks",
				undefined,
				{ service: "webhook" },
			);
		}
	}

	return stats;
}
