import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { type Prisma } from "@/app/generated/prisma/client";
import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import {
	sendAdminNewOrderEmail,
	sendAdminRefundFailedAlert,
	sendAdminDisputeAlert,
	sendAdminInvoiceFailedAlert,
	sendAdminOrderProcessingFailedAlert,
	sendWebhookFailedAlertEmail,
} from "@/modules/emails/services/admin-emails";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import type { PostWebhookTask } from "../types/webhook.types";

/** Customer-facing email task types that warrant an admin alert on failure */
const CRITICAL_EMAIL_TASKS = new Set([
	"ORDER_CONFIRMATION_EMAIL",
	"ADMIN_NEW_ORDER_EMAIL",
	"REFUND_CONFIRMATION_EMAIL",
	"PAYMENT_FAILED_EMAIL",
	"ADMIN_ORDER_PROCESSING_FAILED_ALERT",
]);

export interface PostWebhookTasksResult {
	successful: number;
	failed: number;
	errors: Array<{ type: string; error: string }>;
}

export type EmailTask = Exclude<PostWebhookTask, { type: "INVALIDATE_CACHE" }>;

/**
 * Dispatches a single email task to the correct email service.
 * Exported for use by the retry-failed-emails cron service.
 */
export async function dispatchEmailTask(task: EmailTask): Promise<void> {
	switch (task.type) {
		case "ORDER_CONFIRMATION_EMAIL":
			await sendOrderConfirmationEmail(task.data);
			break;
		case "ADMIN_NEW_ORDER_EMAIL":
			await sendAdminNewOrderEmail(task.data);
			break;
		case "REFUND_CONFIRMATION_EMAIL":
			await sendRefundConfirmationEmail(task.data);
			break;
		case "PAYMENT_FAILED_EMAIL":
			await sendPaymentFailedEmail(task.data);
			break;
		case "ADMIN_REFUND_FAILED_ALERT":
			await sendAdminRefundFailedAlert(task.data);
			break;
		case "ADMIN_DISPUTE_ALERT":
			await sendAdminDisputeAlert(task.data);
			break;
		case "ADMIN_INVOICE_FAILED_ALERT":
			await sendAdminInvoiceFailedAlert(task.data);
			break;
		case "ADMIN_ORDER_PROCESSING_FAILED_ALERT":
			await sendAdminOrderProcessingFailedAlert(task.data);
			break;
	}
}

/**
 * Exécute les tâches post-webhook (emails, cache) en arrière-plan
 * Appelé via after() pour ne pas bloquer la réponse au webhook
 * Retourne des statistiques d'exécution pour monitoring
 */
export async function executePostWebhookTasks(
	tasks: PostWebhookTask[],
): Promise<PostWebhookTasksResult> {
	const result: PostWebhookTasksResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	// Execute all tasks in parallel for better throughput
	const taskResults = await Promise.allSettled(
		tasks.map(async (task) => {
			if (task.type === "INVALIDATE_CACHE") {
				task.tags.forEach((tag) => updateTag(tag));
			} else {
				await dispatchEmailTask(task);
			}
		}),
	);

	// Collect dead-letter persists to run after stats are gathered
	const deadLetterPersists: Promise<void>[] = [];

	for (let i = 0; i < taskResults.length; i++) {
		const taskResult = taskResults[i];
		const task = tasks[i];
		if (taskResult === undefined || task === undefined) continue;
		if (taskResult.status === "fulfilled") {
			result.successful++;
		} else {
			result.failed++;
			const rejected = taskResult as PromiseRejectedResult;
			const errorMessage =
				rejected.reason instanceof Error ? rejected.reason.message : String(rejected.reason);
			result.errors.push({ type: task.type, error: errorMessage });
			logger.error(`[WEBHOOK-AFTER] Failed to execute task ${task.type}:`, rejected.reason, {
				service: "webhook",
			});

			// Persist email task failures to dead-letter table for automatic retry
			if (task.type !== "INVALIDATE_CACHE") {
				const emailTask = task as EmailTask;
				deadLetterPersists.push(
					prisma.failedEmail
						.create({
							data: {
								taskType: task.type,
								payload: emailTask.data as unknown as Prisma.InputJsonValue,
								attempts: 1,
								lastError: errorMessage,
								nextRetryAt: new Date(),
							},
						})
						.then(() => undefined)
						.catch((dbErr: unknown) => {
							logger.error(
								`[WEBHOOK-AFTER] Failed to persist dead-letter email ${task.type}:`,
								dbErr,
								{ service: "webhook" },
							);
						}),
				);
			}
		}
	}

	// Persist dead-letter records (fire-and-forget, non-blocking on failures)
	if (deadLetterPersists.length > 0) {
		await Promise.allSettled(deadLetterPersists);
	}

	// Log résumé si des erreurs
	if (result.failed > 0) {
		logger.warn(`⚠️ [WEBHOOK-AFTER] ${result.failed}/${tasks.length} tasks failed`, {
			service: "webhook",
		});

		// Alert admin if critical customer-facing emails failed
		const criticalFailures = result.errors.filter((e) => CRITICAL_EMAIL_TASKS.has(e.type));
		if (criticalFailures.length > 0) {
			try {
				await sendWebhookFailedAlertEmail({
					eventId: "post-task-email-failure",
					eventType: criticalFailures.map((f) => f.type).join(", "),
					attempts: 1,
					error: criticalFailures.map((f) => `${f.type}: ${f.error}`).join("; "),
				});
			} catch {
				logger.error("[WEBHOOK-AFTER] Failed to send admin alert for email failures", undefined, {
					service: "webhook",
				});
			}
		}
	}

	return result;
}
