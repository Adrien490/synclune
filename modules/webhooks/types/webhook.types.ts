import type {
	sendOrderConfirmationEmail,
	sendAdminNewOrderEmail,
	sendRefundConfirmationEmail,
	sendPaymentFailedEmail,
	sendAdminRefundFailedAlert,
} from "@/shared/lib/email";

/**
 * Tâches à exécuter après la réponse 200 via after()
 * Permet de répondre rapidement à Stripe tout en traitant les emails en arrière-plan
 */
export type PostWebhookTask =
	| { type: "ORDER_CONFIRMATION_EMAIL"; data: Parameters<typeof sendOrderConfirmationEmail>[0] }
	| { type: "ADMIN_NEW_ORDER_EMAIL"; data: Parameters<typeof sendAdminNewOrderEmail>[0] }
	| { type: "REFUND_CONFIRMATION_EMAIL"; data: Parameters<typeof sendRefundConfirmationEmail>[0] }
	| { type: "PAYMENT_FAILED_EMAIL"; data: Parameters<typeof sendPaymentFailedEmail>[0] }
	| { type: "ADMIN_REFUND_FAILED_ALERT"; data: Parameters<typeof sendAdminRefundFailedAlert>[0] }
	| { type: "INVALIDATE_CACHE"; tags: string[] };

/**
 * Résultat d'un handler de webhook avec tâches post-traitement
 */
export interface WebhookHandlerResult {
	success: boolean;
	tasks?: PostWebhookTask[];
	/** Indique si l'événement a été ignoré (type non supporté, etc.) */
	skipped?: boolean;
	/** Raison de l'ignorance si skipped=true */
	reason?: string;
}

/**
 * Signature d'une fonction handler
 */
export type WebhookHandler<T = unknown> = (
	data: T
) => Promise<WebhookHandlerResult | null>;

/**
 * Types d'événements Stripe supportés
 */
export type SupportedStripeEvent =
	| "checkout.session.completed"
	| "checkout.session.expired"
	| "payment_intent.succeeded"
	| "payment_intent.payment_failed"
	| "payment_intent.canceled"
	| "charge.refunded"
	| "refund.created"
	| "refund.updated"
	| "refund.failed"
	| "checkout.session.async_payment_succeeded"
	| "checkout.session.async_payment_failed";
