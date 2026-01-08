import Stripe from "stripe";
import {
	markOrderAsPaid,
	extractPaymentFailureDetails,
	restoreStockForOrder,
	markOrderAsFailed,
	markOrderAsCancelled,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "../services/payment-intent.service";

/**
 * Gère le succès d'un paiement via Payment Intent
 * NOTE: Ce handler ne gère pas les emails car checkout.session.completed le fait déjà
 */
export async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
	const orderId = paymentIntent.metadata?.order_id;

	if (!orderId) {
		// Log pour debugging - pas d'erreur car certains PaymentIntent n'ont pas d'order_id (ex: paiements hors checkout)
		console.warn(`⚠️ [WEBHOOK] payment_intent.succeeded without order_id in metadata (PI: ${paymentIntent.id})`);
		return;
	}

	await markOrderAsPaid(orderId, paymentIntent.id);
}

/**
 * Gère l'échec d'un paiement
 * Restaure le stock réservé et initie un remboursement si nécessaire
 */
export async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order_id in payment intent metadata");
		return;
	}

	try {
		// 1. Extraire les détails d'échec
		const failureDetails = extractPaymentFailureDetails(paymentIntent);

		console.log(`[AUDIT] Payment failure details`, {
			orderId,
			failureCode: failureDetails.code,
			declineCode: failureDetails.declineCode,
			message: failureDetails.message,
		});

		// 2. Restaurer le stock si nécessaire
		await restoreStockForOrder(orderId);

		// 3. Marquer la commande comme échouée
		await markOrderAsFailed(orderId, paymentIntent.id, failureDetails);

		// 4. Remboursement automatique si de l'argent a été capturé
		if (paymentIntent.amount_received > 0) {
			console.log(`💰 [WEBHOOK] Initiating automatic refund for order ${orderId} (${paymentIntent.amount_received} cents captured)`);

			const refundResult = await initiateAutomaticRefund(
				paymentIntent.id,
				orderId,
				"Payment failed, automatic refund"
			);

			if (!refundResult.success && refundResult.error) {
				await sendRefundFailureAlert(
					orderId,
					paymentIntent.id,
					"payment_failed",
					refundResult.error.message
				);
			}
		}

		console.log(`❌ [WEBHOOK] Order ${orderId} payment failed`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling payment failure for order ${orderId}:`, error);
		throw error;
	}
}

/**
 * Gère l'annulation d'un paiement
 * Annule la commande et initie un remboursement si nécessaire
 */
export async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order_id in payment intent metadata");
		return;
	}

	try {
		// 1. Marquer la commande comme annulée
		await markOrderAsCancelled(orderId, paymentIntent.id);

		// 2. Remboursement automatique si paiement a été capturé
		if (paymentIntent.status === "canceled" && paymentIntent.amount_received > 0) {
			console.log(`💰 [WEBHOOK] Initiating automatic refund for canceled order ${orderId}`);

			const refundResult = await initiateAutomaticRefund(
				paymentIntent.id,
				orderId,
				"Payment canceled, automatic refund"
			);

			if (!refundResult.success && refundResult.error) {
				await sendRefundFailureAlert(
					orderId,
					paymentIntent.id,
					"payment_canceled",
					refundResult.error.message
				);
			}
		}

		console.log(`⚠️ [WEBHOOK] Order ${orderId} payment canceled`);
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling payment cancelation for order ${orderId}:`, error);
		throw error;
	}
}
