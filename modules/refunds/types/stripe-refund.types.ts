import type Stripe from "stripe"

export interface CreateStripeRefundParams {
	/** ID du PaymentIntent (pi_xxx) ou du Charge (ch_xxx) */
	paymentIntentId?: string
	chargeId?: string
	/** Montant à rembourser en centimes */
	amount: number
	/** Raison du remboursement (pour Stripe) */
	reason?: Stripe.RefundCreateParams.Reason
	/** Métadonnées additionnelles */
	metadata?: Record<string, string>
	/** Clé d'idempotence pour éviter les doublons */
	idempotencyKey?: string
}

export type StripeRefundStatus =
	| "pending"
	| "requires_action"
	| "succeeded"
	| "failed"
	| "canceled"

export interface StripeRefundResult {
	success: boolean
	pending?: boolean
	refundId?: string
	status?: StripeRefundStatus
	error?: string
}
