import Stripe from "stripe";
import { PaymentStatus } from "@/app/generated/prisma";
import { prisma } from "@/shared/lib/prisma";
import { sendPaymentFailedEmail } from "@/shared/lib/email";
import { handleCheckoutSessionCompleted } from "./checkout-handlers";
import type { WebhookHandlerResult } from "../types/webhook.types";

/**
 * 🏦 Gère les paiements asynchrones réussis (SEPA, Sofort, etc.)
 * Ces paiements sont confirmés après le checkout, parfois plusieurs jours plus tard
 */
export async function handleAsyncPaymentSucceeded(
	session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult | null> {
	console.log(`🏦 [WEBHOOK] Async payment succeeded: ${session.id}`);

	try {
		const orderId = session.metadata?.orderId || session.client_reference_id;

		if (!orderId) {
			console.error("❌ [WEBHOOK] No order ID found in async payment session");
			return null;
		}

		// Traiter comme un checkout.session.completed
		// La logique est identique : mettre à jour le statut, décrémenter le stock, etc.
		const result = await handleCheckoutSessionCompleted(session);

		console.log(`✅ [WEBHOOK] Async payment processed for order ${orderId}`);
		return result;
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling async payment succeeded:`, error);
		throw error; // Propager pour marquer l'événement comme FAILED
	}
}

/**
 * 🚫 Gère les paiements asynchrones échoués
 * Annule la commande et notifie le client
 */
export async function handleAsyncPaymentFailed(
	session: Stripe.Checkout.Session
): Promise<void> {
	console.log(`🚫 [WEBHOOK] Async payment failed: ${session.id}`);

	try {
		const orderId = session.metadata?.orderId || session.client_reference_id;

		if (!orderId) {
			console.error("❌ [WEBHOOK] No order ID found in failed async payment session");
			return;
		}

		// Mettre à jour la commande comme échouée
		const order = await prisma.order.update({
			where: { id: orderId },
			data: {
				paymentStatus: PaymentStatus.FAILED,
				status: "CANCELLED",
			},
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				customerName: true,
			},
		});

		console.log(`⚠️ [WEBHOOK] Order ${order.orderNumber} marked as FAILED due to async payment failure`);

		// Envoyer un email au client pour l'informer de l'échec
		const retryUrl = `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://synclune.fr"}/creations`;
		await sendPaymentFailedEmail({
			to: order.customerEmail,
			customerName: order.customerName,
			orderNumber: order.orderNumber,
			retryUrl,
		});
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling async payment failed:`, error);
		throw error;
	}
}
