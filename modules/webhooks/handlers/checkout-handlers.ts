import Stripe from "stripe";
import type { WebhookHandlerResult } from "../types/webhook.types";
import {
	extractShippingInfo,
	processOrderTransaction,
	buildPostCheckoutTasks,
	cancelExpiredOrder,
} from "../services/checkout.service";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

/**
 * Gère la complétion d'une session checkout
 * C'est le handler principal qui traite les paiements réussis
 */
export async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult | null> {
	// Validation payment_status AVANT tout traitement
	// Pour les paiements asynchrones (SEPA, etc.), payment_status peut être 'unpaid'
	if (session.payment_status === "unpaid") {
		console.log(`⏳ [WEBHOOK] Session ${session.id} payment_status is 'unpaid', waiting for async payment confirmation`);
		return null;
	}

	// Récupérer l'ID de commande depuis les metadata
	// Priorité: metadata.orderId (standard) puis client_reference_id (fallback legacy)
	// Les deux sont définis lors de la création de la session checkout pour compatibilité
	const orderId = session.metadata?.orderId || session.client_reference_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order ID found in checkout session");
		throw new Error("No order ID found in checkout session metadata");
	}

	try {
		// 1. Extraire les informations de livraison depuis Stripe
		const { shippingCost, shippingMethod, shippingRateId } = await extractShippingInfo(session);
		console.log(`📦 [WEBHOOK] Shipping extracted for order ${orderId}: ${shippingCost / 100}€ (${shippingMethod})`);

		// 2. Traiter la commande dans une transaction atomique
		const order = await processOrderTransaction(orderId, session, shippingCost, shippingRateId);

		// 3. Construire les tâches post-webhook (emails, cache)
		const tasks = buildPostCheckoutTasks(order, session);

		return { success: true, tasks };
	} catch (error) {
		console.error("❌ [WEBHOOK] Error handling checkout session completed:", error);
		throw error;
	}
}

/**
 * Gère l'expiration d'une session de checkout
 * Marque la commande comme annulée après expiration sans paiement
 */
export async function handleCheckoutSessionExpired(
	session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
	const orderId = session.metadata?.orderId || session.client_reference_id;

	if (!orderId) {
		console.error("❌ [WEBHOOK] No order ID found in expired checkout session");
		throw new Error("No order ID found in expired checkout session metadata");
	}

	console.log(`⏰ [WEBHOOK] Processing expired checkout session: ${session.id}, order: ${orderId}`);

	try {
		await cancelExpiredOrder(orderId);

		return {
			success: true,
			tasks: [{
				type: "INVALIDATE_CACHE",
				tags: [
					ORDERS_CACHE_TAGS.LIST,
					SHARED_CACHE_TAGS.ADMIN_BADGES,
					SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
					DASHBOARD_CACHE_TAGS.KPIS,
					DASHBOARD_CACHE_TAGS.REVENUE_CHART,
					DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
					DISCOUNT_CACHE_TAGS.LIST,
				],
			}],
		};
	} catch (error) {
		console.error(
			`❌ [WEBHOOK] Error handling expired checkout session for order ${orderId}:`,
			error
		);
		throw error;
	}
}
