import type { RefundReason, RefundStatus } from "@/app/generated/prisma/client";
import type { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import type {
	sendAdminNewOrderEmail,
	sendAdminRefundFailedAlert,
	sendAdminDisputeAlert,
	sendAdminInvoiceFailedAlert,
	sendAdminOrderProcessingFailedAlert,
} from "@/modules/emails/services/admin-emails";
import type { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import type { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";

// ============================================================================
// SERVICE RESULT TYPES
// ============================================================================

/** Enregistrement de remboursement avec ses relations */
export interface RefundRecord {
	id: string;
	status: RefundStatus;
	amount: number;
	reason: RefundReason;
	orderId: string;
	order: {
		id: string;
		orderNumber: string;
		customerEmail: string | null;
		stripePaymentIntentId: string | null;
	};
}

/** Détails d'un échec de paiement Stripe */
export interface PaymentFailureDetails {
	code: string | null;
	declineCode: string | null;
	message: string | null;
}

// ============================================================================
// WEBHOOK TASK TYPES
// ============================================================================

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
	| { type: "ADMIN_DISPUTE_ALERT"; data: Parameters<typeof sendAdminDisputeAlert>[0] }
	| { type: "ADMIN_INVOICE_FAILED_ALERT"; data: Parameters<typeof sendAdminInvoiceFailedAlert>[0] }
	| {
			type: "ADMIN_ORDER_PROCESSING_FAILED_ALERT";
			data: Parameters<typeof sendAdminOrderProcessingFailedAlert>[0];
	  }
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
 * Types d'événements Stripe supportés.
 *
 * Migration Checkout Sessions (mai 2026) : les events `payment_intent.*` ne
 * sont plus traités côté Synclune — la création d'Order passe exclusivement par
 * `checkout.session.completed` / `async_payment_succeeded`. Les refunds restent
 * sur les events `charge.refunded` / `refund.*` (opèrent sur le PI sous-jacent).
 */
export type SupportedStripeEvent =
	| "checkout.session.completed"
	| "checkout.session.expired"
	| "checkout.session.async_payment_succeeded"
	| "checkout.session.async_payment_failed"
	| "charge.refunded"
	| "refund.created"
	| "refund.updated"
	| "refund.failed"
	| "charge.dispute.created"
	| "charge.dispute.closed";
