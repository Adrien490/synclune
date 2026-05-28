import { logger } from "@/shared/lib/logger";
import { retryPendingPostWebhookTasks } from "@/modules/webhooks/services/post-webhook-tasks.service";
import { BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "retry-post-webhook-tasks";

/**
 * Retries PostWebhookTask rows stuck in PENDING/FAILED.
 *
 * ORD-STRIPE-003 — un crash de la lambda Vercel entre `after()` start et
 * email-send laissait des emails de confirmation perdus sans backstop (Stripe
 * ne re-livre pas après 200). Maintenant les tasks sont persistées par
 * `route.ts` (Stripe webhook) + `retry-webhooks.service.ts` (event retry) dans
 * la MÊME tx que `WebhookEvent.status=COMPLETED`. Ce cron repop les tasks
 * dont le runner `after()` n'a pas pu marquer COMPLETED (lambda kill, panique
 * réseau, redémarrage Vercel).
 *
 * Cadence : toutes les 5 minutes (cf vercel.json).
 * Bornes : MAX_POST_WEBHOOK_RETRY_ATTEMPTS (5) tentatives par task. Au-delà,
 * la task reste FAILED + alerte admin émise par `executeBatch` (cf
 * `post-webhook-tasks.service.ts` → CRITICAL_EMAIL_TASKS).
 */
export async function retryPostWebhookTasks(): Promise<CronResult> {
	logger.info("Starting post-webhook tasks retry", { cronJob: CRON_JOB });

	const stats = await retryPendingPostWebhookTasks(BATCH_SIZE_MEDIUM);

	logger.info("Post-webhook tasks retry completed", {
		cronJob: CRON_JOB,
		successful: stats.successful,
		failed: stats.failed,
		skipped: stats.skipped,
	});

	return {
		processed: stats.successful,
		errored: stats.failed,
		skipped: stats.skipped,
		hasMore: stats.successful + stats.failed >= BATCH_SIZE_MEDIUM,
	};
}
