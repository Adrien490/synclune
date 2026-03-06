import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import {
	BATCH_SIZE_MEDIUM,
	BATCH_DEADLINE_MS,
	EMAIL_THROTTLE_MS,
	MAX_EMAIL_RETRY_ATTEMPTS,
	EMAIL_RETRY_BACKOFF_MINUTES,
} from "@/modules/cron/constants/limits";
import { dispatchEmailTask, type EmailTask } from "@/modules/webhooks/utils/execute-post-tasks";

export interface RetryFailedEmailsResult {
	found: number;
	retried: number;
	resolved: number;
	errors: number;
	hasMore: boolean;
}

/**
 * Retries email tasks that failed during post-webhook processing.
 * Uses exponential backoff: 1h → 4h → 16h before giving up.
 * Records with attempts >= MAX_EMAIL_RETRY_ATTEMPTS are left unresolved for manual review.
 */
export async function retryFailedEmails(): Promise<RetryFailedEmailsResult> {
	logger.info("Starting failed email retry", { cronJob: "retry-failed-emails" });

	const batchStart = Date.now();
	const now = new Date();

	const candidates = await prisma.failedEmail.findMany({
		where: {
			resolvedAt: null,
			nextRetryAt: { lte: now },
			attempts: { lt: MAX_EMAIL_RETRY_ATTEMPTS },
		},
		orderBy: { nextRetryAt: "asc" },
		take: BATCH_SIZE_MEDIUM + 1,
	});

	const hasMore = candidates.length > BATCH_SIZE_MEDIUM;
	const batch = candidates.slice(0, BATCH_SIZE_MEDIUM);

	let retried = 0;
	let resolved = 0;
	let errors = 0;

	for (const failedEmail of batch) {
		if (Date.now() - batchStart > BATCH_DEADLINE_MS) {
			logger.warn("[CRON:retry-failed-emails] Deadline exceeded, stopping early", {
				cronJob: "retry-failed-emails",
			});
			break;
		}

		try {
			const task = {
				type: failedEmail.taskType,
				data: failedEmail.payload,
			} as EmailTask;

			await dispatchEmailTask(task);

			await prisma.failedEmail.update({
				where: { id: failedEmail.id },
				data: { resolvedAt: new Date() },
			});

			resolved++;
			logger.info(`[CRON:retry-failed-emails] Resolved ${failedEmail.taskType} ${failedEmail.id}`, {
				cronJob: "retry-failed-emails",
			});
		} catch (err) {
			errors++;
			const errorMessage = err instanceof Error ? err.message : String(err);
			const nextAttempts = failedEmail.attempts + 1;
			const backoffMinutes =
				(EMAIL_RETRY_BACKOFF_MINUTES as readonly number[])[failedEmail.attempts] ?? 960;
			const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

			await prisma.failedEmail
				.update({
					where: { id: failedEmail.id },
					data: {
						attempts: nextAttempts,
						lastError: errorMessage,
						nextRetryAt,
					},
				})
				.catch((dbErr: unknown) => {
					logger.error(
						`[CRON:retry-failed-emails] Failed to update retry state for ${failedEmail.id}:`,
						dbErr,
						{ cronJob: "retry-failed-emails" },
					);
				});

			logger.error(
				`[CRON:retry-failed-emails] Retry failed for ${failedEmail.taskType} ${failedEmail.id} (attempt ${nextAttempts}/${MAX_EMAIL_RETRY_ATTEMPTS}):`,
				err,
				{ cronJob: "retry-failed-emails" },
			);
		}

		retried++;
		await new Promise((resolve) => setTimeout(resolve, EMAIL_THROTTLE_MS));
	}

	logger.info(`✅ [CRON:retry-failed-emails] ${resolved}/${retried} resolved, ${errors} errors`, {
		cronJob: "retry-failed-emails",
	});

	return { found: batch.length, retried, resolved, errors, hasMore };
}
