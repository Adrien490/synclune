/**
 * Anti-replay window en secondes (5 minutes)
 * Stripe recommande une fenêtre de 5 minutes maximum
 */
export const ANTI_REPLAY_WINDOW_SECONDS = 300

/**
 * Labels pour les types d'événements (UI admin)
 */
export const WEBHOOK_EVENT_LABELS: Record<string, string> = {
	"checkout.session.completed": "Paiement checkout complété",
	"checkout.session.expired": "Session checkout expirée",
	"payment_intent.succeeded": "Paiement réussi",
	"payment_intent.payment_failed": "Paiement échoué",
	"payment_intent.canceled": "Paiement annulé",
	"charge.refunded": "Remboursement effectué",
	"refund.created": "Remboursement créé",
	"refund.updated": "Remboursement mis à jour",
	"refund.failed": "Remboursement échoué",
	"checkout.session.async_payment_succeeded": "Paiement asynchrone réussi",
	"checkout.session.async_payment_failed": "Paiement asynchrone échoué",
	"charge.dispute.created": "Litige ouvert",
	"charge.dispute.closed": "Litige clôturé",
} as const;

/**
 * Catégories d'événements pour le regroupement
 */
export const WEBHOOK_EVENT_CATEGORIES = {
	CHECKOUT: ["checkout.session.completed", "checkout.session.expired"],
	PAYMENT: ["payment_intent.succeeded", "payment_intent.payment_failed", "payment_intent.canceled"],
	REFUND: ["charge.refunded", "refund.created", "refund.updated", "refund.failed"],
	ASYNC_PAYMENT: ["checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"],
	DISPUTE: ["charge.dispute.created", "charge.dispute.closed"],
} as const;
