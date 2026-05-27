export interface CreateStripeRefundParams {
	/** ID du PaymentIntent (pi_xxx) ou du Charge (ch_xxx) */
	paymentIntentId?: string;
	chargeId?: string;
	/** Montant à rembourser en centimes */
	amount: number;
	/** Raison du remboursement (RefundReason interne, mappée vers Stripe) */
	reason?: string;
	/** Métadonnées additionnelles */
	metadata?: Record<string, string>;
	/** Clé d'idempotence pour éviter les doublons */
	idempotencyKey?: string;
	/**
	 * ORD-REFUND-008: si fourni, court-circuite le retrieve PaymentIntent
	 * pour validation de devise (la commande tient déjà cette info en DB).
	 * Économise 1 round-trip Stripe par appel.
	 */
	expectedCurrency?: string;
}

export type StripeRefundStatus =
	| "pending"
	| "requires_action"
	| "succeeded"
	| "failed"
	| "canceled";

export interface StripeRefundResult {
	success: boolean;
	pending?: boolean;
	refundId?: string;
	status?: StripeRefundStatus;
	error?: string;
}
