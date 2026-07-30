import type { RefundReason, RefundStatus } from "@/app/generated/prisma/client";
import type { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import type {
	sendAdminRefundFailedAlert,
	sendAdminDisputeAlert,
	sendAdminInvoiceFailedAlert,
	sendAdminOrderProcessingFailedAlert,
	sendAdminDashboardRefundAttentionAlert,
	sendAdminCreditNoteOverlapAlert,
} from "@/modules/emails/services/admin-emails";
import type { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";

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
	/** ORD-REFUND-AUDIT-004 : guard SAGA admin in-flight dans webhook handler */
	processedAt: Date | null;
	/** ORD-REFUND-AUDIT-004 : âge mutation pour fenêtre SAGA 30s */
	updatedAt: Date;
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
	| { type: "REFUND_CONFIRMATION_EMAIL"; data: Parameters<typeof sendRefundConfirmationEmail>[0] }
	| { type: "ADMIN_REFUND_FAILED_ALERT"; data: Parameters<typeof sendAdminRefundFailedAlert>[0] }
	| { type: "ADMIN_DISPUTE_ALERT"; data: Parameters<typeof sendAdminDisputeAlert>[0] }
	| { type: "ADMIN_INVOICE_FAILED_ALERT"; data: Parameters<typeof sendAdminInvoiceFailedAlert>[0] }
	| {
			type: "ADMIN_ORDER_PROCESSING_FAILED_ALERT";
			data: Parameters<typeof sendAdminOrderProcessingFailedAlert>[0];
	  }
	| {
			// ORD-STRIPE-006 : alerte admin pour Dashboard refunds nécessitant attention
			type: "ADMIN_DASHBOARD_REFUND_ALERT";
			data: Parameters<typeof sendAdminDashboardRefundAttentionAlert>[0];
	  }
	| {
			// EINV-CREDIT-015 : avoir total émis alors que des avoirs partiels existent
			// déjà → sur-crédit potentiel à réconcilier (audit couverture 2026-05-30 P1-B)
			type: "ADMIN_CREDIT_NOTE_OVERLAP_ALERT";
			data: Parameters<typeof sendAdminCreditNoteOverlapAlert>[0];
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
 * Types d'événements Stripe supportés
 */
export type SupportedStripeEvent =
	| "payment_intent.succeeded"
	| "payment_intent.payment_failed"
	| "payment_intent.canceled"
	| "payment_intent.processing"
	| "charge.refunded"
	| "refund.created"
	| "refund.updated"
	// Alias legacy Stripe : certaines versions d'API / abonnements d'endpoint
	// émettent encore `charge.refund.updated` au lieu de `refund.updated`.
	| "charge.refund.updated"
	| "refund.failed"
	| "charge.dispute.created"
	| "charge.dispute.closed"
	| "invoice.payment_failed";
