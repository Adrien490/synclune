import { updateTag } from "next/cache";
import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import { sendAdminNewOrderEmail, sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import type { PostWebhookTask } from "../types/webhook.types";

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
	}

	return result;
}
