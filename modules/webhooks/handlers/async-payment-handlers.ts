import Stripe from "stripe";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { handleCheckoutSessionCompleted } from "./checkout-handlers";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getBaseUrl } from "@/shared/constants/urls";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";

/**
 * Gère les paiements asynchrones réussis (SEPA, Sofort, etc.)
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
			throw new Error("No order ID found in async payment session metadata");
		}

		// Traiter comme un checkout.session.completed
		// La logique est identique : mettre à jour le statut, décrémenter le stock, etc.
		const result = await handleCheckoutSessionCompleted(session);

		console.log(`✅ [WEBHOOK] Async payment processed for order ${orderId}`);
		return result;
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling async payment succeeded:`, error);
		throw error;
	}
}

/**
 * Gère les paiements asynchrones échoués
 * Annule la commande et notifie le client
 */
export async function handleAsyncPaymentFailed(
	session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
	console.log(`🚫 [WEBHOOK] Async payment failed: ${session.id}`);

	try {
		const orderId = session.metadata?.orderId || session.client_reference_id;

		if (!orderId) {
			console.error("❌ [WEBHOOK] No order ID found in failed async payment session");
			throw new Error("No order ID found in failed async payment session metadata");
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

		// Build post-tasks (email + cache invalidation)
		const tasks: PostWebhookTask[] = [];

		tasks.push({
			type: "INVALIDATE_CACHE",
			tags: [ORDERS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES],
		});

		const retryUrl = `${getBaseUrl()}/creations`;
		tasks.push({
			type: "PAYMENT_FAILED_EMAIL",
			data: {
				to: order.customerEmail,
				customerName: order.customerName,
				orderNumber: order.orderNumber,
				retryUrl,
			},
		});

		return { success: true, tasks };
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling async payment failed:`, error);
		throw error;
	}
}
