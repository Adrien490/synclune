import { updateTag } from "next/cache";
import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import { sendAdminNewOrderEmail, sendAdminRefundFailedAlert, sendAdminDisputeAlert, sendAdminInvoiceFailedAlert, sendWebhookFailedAlertEmail } from "@/modules/emails/services/admin-emails";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import { logFailedEmail } from "@/modules/emails/services/log-failed-email";
import type { PostWebhookTask } from "../types/webhook.types";

/** Customer-facing email task types that warrant an admin alert on failure */
const CRITICAL_EMAIL_TASKS = new Set(["ORDER_CONFIRMATION_EMAIL", "ADMIN_NEW_ORDER_EMAIL", "REFUND_CONFIRMATION_EMAIL", "PAYMENT_FAILED_EMAIL"]);

/** Maps task types to template names for logFailedEmail retry system */
const TASK_TEMPLATE_MAP: Record<string, string> = {
	ORDER_CONFIRMATION_EMAIL: "order-confirmation",
	REFUND_CONFIRMATION_EMAIL: "refund-confirmation",
	PAYMENT_FAILED_EMAIL: "payment-failed",
};

export interface PostWebhookTasksResult {
	successful: number;
	failed: number;
	errors: Array<{ type: string; error: string }>;
}

/**
 * Exécute les tâches post-webhook (emails, cache) en arrière-plan
 * Appelé via after() pour ne pas bloquer la réponse au webhook
 * Retourne des statistiques d'exécution pour monitoring
 */
export async function executePostWebhookTasks(tasks: PostWebhookTask[]): Promise<PostWebhookTasksResult> {
	const result: PostWebhookTasksResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	// Execute all tasks in parallel for better throughput
	const taskResults = await Promise.allSettled(
		tasks.map(async (task) => {
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
				case "INVALIDATE_CACHE":
					task.tags.forEach(tag => updateTag(tag));
					break;
			}
		})
	);

	for (let i = 0; i < taskResults.length; i++) {
		const taskResult = taskResults[i];
		if (taskResult.status === "fulfilled") {
			result.successful++;
		} else {
			result.failed++;
			const errorMessage = taskResult.reason instanceof Error ? taskResult.reason.message : String(taskResult.reason);
			result.errors.push({ type: tasks[i].type, error: errorMessage });
			console.error(`[WEBHOOK-AFTER] Failed to execute task ${tasks[i].type}:`, taskResult.reason);
		}
	}

	// Log résumé si des erreurs
	if (result.failed > 0) {
		console.warn(`⚠️ [WEBHOOK-AFTER] ${result.failed}/${tasks.length} tasks failed`);

		// Log failed customer-facing emails for automatic retry via cron
		for (let j = 0; j < taskResults.length; j++) {
			if (taskResults[j].status !== "rejected") continue;
			const task = tasks[j];
			const templateName = TASK_TEMPLATE_MAP[task.type];
			if (!templateName || task.type === "INVALIDATE_CACHE") continue;

			const data = task.data as Record<string, unknown>;
			const to = data.to as string | undefined;
			if (!to) continue;

			logFailedEmail({
				to,
				subject: `[Retry] ${task.type}`,
				template: templateName,
				payload: data,
				error: taskResults[j].status === "rejected" ? (taskResults[j] as PromiseRejectedResult).reason : "Unknown error",
				orderId: (data.orderId as string) ?? undefined,
			});
		}

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
				console.error("[WEBHOOK-AFTER] Failed to send admin alert for email failures");
			}
		}
	}

	return result;
}
