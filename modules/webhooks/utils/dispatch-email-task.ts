import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import {
	sendAdminRefundFailedAlert,
	sendAdminDisputeAlert,
	sendAdminInvoiceFailedAlert,
	sendAdminOrderProcessingFailedAlert,
	sendAdminDashboardRefundAttentionAlert,
} from "@/modules/emails/services/admin-emails";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendRefundConfirmationOnce } from "@/modules/refunds/services/send-refund-confirmation.service";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import type { PostWebhookTask } from "../types/webhook.types";

/**
 * EMAIL-AUDIT-101 — source unique du routing task → service d'envoi.
 *
 * Auparavant ce switch était dupliqué dans `post-webhook-tasks.service.ts`
 * (path vivant, DB-backed) ET `execute-post-tasks.ts` (path in-memory, mort).
 * Les deux avaient divergé : la copie morte utilisait le `sendRefundConfirmationEmail`
 * non-atomique et n'avait pas le case `ADMIN_DASHBOARD_REFUND_ALERT` — un task type
 * ajouté à un seul des deux pouvait tomber silencieusement dans le `default`.
 * Centraliser ici garantit qu'un seul switch existe.
 */

/** Tâches email orientées client qui justifient une alerte admin en cas d'échec. */
export const CRITICAL_EMAIL_TASKS = new Set([
	"ORDER_CONFIRMATION_EMAIL",
	"REFUND_CONFIRMATION_EMAIL",
	"PAYMENT_FAILED_EMAIL",
	"ADMIN_ORDER_PROCESSING_FAILED_ALERT",
]);

export type EmailTask = Exclude<PostWebhookTask, { type: "INVALIDATE_CACHE" }>;

/**
 * Route une tâche email vers le service d'envoi correspondant.
 * Pure : pas de persistance DB ni de gestion de retry (assurées par l'appelant).
 */
export async function dispatchEmailTask(task: EmailTask): Promise<void> {
	switch (task.type) {
		case "ORDER_CONFIRMATION_EMAIL":
			await sendOrderConfirmationEmail(task.data);
			break;
		case "REFUND_CONFIRMATION_EMAIL":
			// ORD-STRIPE-005 : si le payload contient refundId, on passe par
			// sendRefundConfirmationOnce qui pose `Refund.confirmationEmailSentAt`
			// atomiquement → bloque SAGA admin / cron qui auraient envoyé un 2e mail.
			if (task.data.refundId) {
				await sendRefundConfirmationOnce({
					refundId: task.data.refundId,
					to: task.data.to,
					orderNumber: task.data.orderNumber,
					customerName: task.data.customerName,
					refundAmount: task.data.refundAmount,
					reason: task.data.reason as Parameters<typeof sendRefundConfirmationOnce>[0]["reason"],
					orderDetailsUrl: task.data.orderDetailsUrl,
					invoiceNumber: task.data.invoiceNumber ?? null,
					creditNoteNumber: task.data.creditNoteNumber ?? null,
				});
			} else {
				await sendRefundConfirmationEmail(task.data);
			}
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
		case "ADMIN_DASHBOARD_REFUND_ALERT":
			await sendAdminDashboardRefundAttentionAlert(task.data);
			break;
	}
}
