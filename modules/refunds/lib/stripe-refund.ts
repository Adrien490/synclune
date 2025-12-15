import { stripe } from "@/shared/lib/stripe";
import Stripe from "stripe";

export interface CreateStripeRefundParams {
	/** ID du PaymentIntent (pi_xxx) ou du Charge (ch_xxx) */
	paymentIntentId?: string;
	chargeId?: string;
	/** Montant à rembourser en centimes */
	amount: number;
	/** Raison du remboursement (pour Stripe) */
	reason?: Stripe.RefundCreateParams.Reason;
	/** Métadonnées additionnelles */
	metadata?: Record<string, string>;
	/** Clé d'idempotence pour éviter les doublons */
	idempotencyKey?: string;
}

/** Statut d'un remboursement Stripe */
export type StripeRefundStatus =
	| "pending"
	| "requires_action"
	| "succeeded"
	| "failed"
	| "canceled";

export interface StripeRefundResult {
	success: boolean;
	refundId?: string;
	status?: StripeRefundStatus;
	error?: string;
}

/**
 * Crée un remboursement via l'API Stripe
 *
 * @param params Paramètres du remboursement
 * @returns Résultat avec l'ID du remboursement Stripe ou erreur
 */
export async function createStripeRefund(
	params: CreateStripeRefundParams
): Promise<StripeRefundResult> {
	try {
		// Valider qu'on a soit un paymentIntentId soit un chargeId
		if (!params.paymentIntentId && !params.chargeId) {
			return {
				success: false,
				error: "Un PaymentIntent ID ou Charge ID est requis pour le remboursement",
			};
		}

		// Construire les paramètres du remboursement
		const refundParams: Stripe.RefundCreateParams = {
			amount: params.amount,
			reason: params.reason || "requested_by_customer",
			metadata: params.metadata,
		};

		// Prioriser le PaymentIntent si disponible
		if (params.paymentIntentId) {
			refundParams.payment_intent = params.paymentIntentId;
		} else if (params.chargeId) {
			refundParams.charge = params.chargeId;
		}

		// Créer le remboursement Stripe avec clé d'idempotence
		const requestOptions: Stripe.RequestOptions = {};
		if (params.idempotencyKey) {
			requestOptions.idempotencyKey = params.idempotencyKey;
		}

		const refund = await stripe.refunds.create(refundParams, requestOptions);

		return {
			success: refund.status === "succeeded" || refund.status === "pending",
			refundId: refund.id,
			status: (refund.status ?? undefined) as StripeRefundStatus | undefined,
		};
	} catch (error) {
		console.error("[STRIPE_REFUND_ERROR]", error);

		// Gérer les erreurs Stripe spécifiques
		if (error instanceof Stripe.errors.StripeError) {
			return {
				success: false,
				error: error.message,
			};
		}

		return {
			success: false,
			error: "Erreur lors de la création du remboursement Stripe",
		};
	}
}

/**
 * Récupère le statut d'un remboursement Stripe
 *
 * @param refundId ID du remboursement Stripe (re_xxx)
 * @returns Statut du remboursement
 */
export async function getStripeRefundStatus(
	refundId: string
): Promise<StripeRefundStatus | null> {
	try {
		const refund = await stripe.refunds.retrieve(refundId);
		return refund.status as StripeRefundStatus | null;
	} catch (error) {
		console.error("[STRIPE_REFUND_STATUS_ERROR]", error);
		return null;
	}
}

