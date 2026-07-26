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
	/**
	 * IDEM-REFUND-001 : sur un chemin de RETRY (attempt_count > 0), pré-liste les
	 * refunds Stripe du PI/charge et ADOPTE celui dont `metadata.refund_id`
	 * matche, au lieu de créer. Ferme le double-débit : si le 1ᵉʳ
	 * `refunds.create` a réussi côté Stripe mais que la réponse a été perdue
	 * (timeout post-commit), le refund a été marqué FAILED sans anchor
	 * `stripeRefundId` — la rotation de clé d'idempotence (P0.2) créerait alors
	 * un 2ᵉ refund réel (un refund PARTIEL passe si le solde de la charge
	 * suffit ; `charge_already_refunded` ne protège que le remboursement total).
	 * Fail-closed : si la liste Stripe échoue, on n'appelle PAS create.
	 */
	recoverExistingByMetadata?: boolean;
}

export type StripeRefundStatus =
	"pending" | "requires_action" | "succeeded" | "failed" | "canceled";

export interface StripeRefundResult {
	success: boolean;
	pending?: boolean;
	refundId?: string;
	status?: StripeRefundStatus;
	error?: string;
	/**
	 * Classification `classifyStripeError` de l'échec (absent si succès ou
	 * erreur de validation locale). `retryable: true` = erreur transiente
	 * (rate limit, réseau) : un retry admin a de bonnes chances d'aboutir.
	 */
	errorKind?: "user" | "transient" | "bug" | "unknown";
	retryable?: boolean;
}
