import { revalidateTag } from "next/cache";
import {
	sendOrderConfirmationEmail,
	sendAdminNewOrderEmail,
	sendRefundConfirmationEmail,
	sendPaymentFailedEmail,
	sendAdminRefundFailedAlert,
} from "@/shared/lib/email";
import type { PostWebhookTask } from "../types/webhook.types";

/**
 * Exécute les tâches post-webhook (emails, cache) en arrière-plan
 * Appelé via after() pour ne pas bloquer la réponse au webhook
 */
export async function executePostWebhookTasks(tasks: PostWebhookTask[]): Promise<void> {
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
					task.tags.forEach(tag => revalidateTag(tag, "max"));
					break;
			}
		} catch (error) {
			// Log mais ne pas bloquer les autres tâches
			console.error(`❌ [WEBHOOK-AFTER] Failed to execute task ${task.type}:`, error);
		}
	}
}
