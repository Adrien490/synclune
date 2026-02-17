import { updateTag } from "next/cache";
import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import { sendAdminNewOrderEmail, sendAdminRefundFailedAlert, sendAdminDisputeAlert, sendWebhookFailedAlertEmail } from "@/modules/emails/services/admin-emails";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import type { PostWebhookTask } from "../types/webhook.types";

/** Customer-facing email task types that warrant an admin alert on failure */
const CRITICAL_EMAIL_TASKS = new Set(["ORDER_CONFIRMATION_EMAIL", "REFUND_CONFIRMATION_EMAIL", "PAYMENT_FAILED_EMAIL"]);

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

	for (const task of tasks) {
		try {
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
				case "INVALIDATE_CACHE":
					task.tags.forEach(tag => updateTag(tag));
					break;
			}
			result.successful++;
		} catch (error) {
			result.failed++;
			const errorMessage = error instanceof Error ? error.message : String(error);
			result.errors.push({ type: task.type, error: errorMessage });
			// Log mais ne pas bloquer les autres tâches
			console.error(`❌ [WEBHOOK-AFTER] Failed to execute task ${task.type}:`, error);
		}
	}

	// Log résumé si des erreurs
	if (result.failed > 0) {
		console.warn(`⚠️ [WEBHOOK-AFTER] ${result.failed}/${tasks.length} tasks failed`);

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
				console.error("❌ [WEBHOOK-AFTER] Failed to send admin alert for email failures");
			}
		}
	}

	return result;
}
