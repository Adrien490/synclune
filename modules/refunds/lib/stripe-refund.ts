import { stripe } from "@/shared/lib/stripe";
import Stripe from "stripe";
import type {
	CreateStripeRefundParams,
	StripeRefundStatus,
	StripeRefundResult,
} from "../types/stripe-refund.types";

export type { CreateStripeRefundParams, StripeRefundStatus, StripeRefundResult };

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

		// P0.1: Distinguer pending de succeeded
		// - succeeded = remboursement confirmé immédiatement
		// - pending = en attente de confirmation (ex: virement bancaire)
		return {
			success: refund.status === "succeeded",
			pending: refund.status === "pending",
			refundId: refund.id,
			status: (refund.status ?? undefined) as StripeRefundStatus | undefined,
		};
	} catch (error) {
		console.error("[STRIPE_REFUND_ERROR]", error);

		// Gérer les erreurs Stripe spécifiques
		if (error instanceof Stripe.errors.StripeError) {
			// P0.3: Idempotence - si déjà remboursé, c'est un succès
			// Peut arriver si retry webhook ou hash collision idempotency key
			if (error.code === "charge_already_refunded") {
				console.log("[STRIPE_REFUND] Charge already refunded, treating as success (idempotence)");
				return {
					success: true,
					pending: false,
				};
			}

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

