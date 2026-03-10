import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import type { WebhookHandlerResult } from "../types/webhook.types";
import {
	extractShippingInfo,
	processOrderTransaction,
	buildPostCheckoutTasks,
	cancelExpiredOrder,
} from "../services/checkout.service";
import { sendAdminOrderProcessingFailedAlert } from "@/modules/emails/services/admin-emails";
import { prisma } from "@/shared/lib/prisma";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";

/**
 * Gère la complétion d'une session checkout
 * C'est le handler principal qui traite les paiements réussis
 */
export async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult | null> {
	// Validation payment_status AVANT tout traitement
	// Pour les paiements asynchrones (SEPA, etc.), payment_status peut être 'unpaid'
	if (session.payment_status === "unpaid") {
		logger.info(
			`⏳ [WEBHOOK] Session ${session.id} payment_status is 'unpaid', waiting for async payment confirmation`,
			{ service: "webhook" },
		);
		return null;
	}

	// Récupérer l'ID de commande depuis les metadata
	// Priorité: metadata.orderId (standard) puis client_reference_id (fallback legacy)
	// Les deux sont définis lors de la création de la session checkout pour compatibilité
	const orderId = session.metadata?.orderId ?? session.client_reference_id;

	if (!orderId) {
		logger.error("❌ [WEBHOOK] No order ID found in checkout session", undefined, {
			service: "webhook",
		});
		throw new Error("No order ID found in checkout session metadata");
	}

	try {
		// 1. Extraire les informations de livraison depuis Stripe
		const { shippingCost, shippingMethod, shippingRateId } = await extractShippingInfo(session);
		logger.info(
			`📦 [WEBHOOK] Shipping extracted for order ${orderId}: ${shippingCost / 100}€ (${shippingMethod})`,
			{ service: "webhook" },
		);

		// 2. Traiter la commande dans une transaction atomique
		const order = await processOrderTransaction(orderId, session, shippingCost, shippingRateId);

		// 3. Construire les tâches post-webhook (emails, cache)
		const tasks = buildPostCheckoutTasks(order, session);

		// 4. Anti-fraud: detect email mismatch between Stripe and order
		const stripeEmail = session.customer_email ?? session.customer_details?.email;
		if (stripeEmail) {
			const dbOrder = await prisma.order.findUnique({
				where: { id: orderId },
				select: { customerEmail: true },
			});
			if (
				dbOrder?.customerEmail &&
				stripeEmail.toLowerCase() !== dbOrder.customerEmail.toLowerCase()
			) {
				logger.warn(`[WEBHOOK] Email mismatch detected for order ${orderId}`, {
					service: "webhook",
				});
				// Create an admin OrderNote for visibility
				await prisma.orderNote.create({
					data: {
						orderId,
						content:
							`[ALERTE EMAIL] Email Stripe (${stripeEmail}) ne correspond pas a l'email commande (${dbOrder.customerEmail}). ` +
							`Verifier la legitimite de cette commande.`,
						authorId: SYSTEM_AUTHOR_ID,
						authorName: "Systeme (webhook Stripe)",
					},
				});
				// Add cache invalidation for order notes
				tasks.push({
					type: "INVALIDATE_CACHE",
					tags: [ORDERS_CACHE_TAGS.NOTES(orderId)],
				});
			}
		}

		return { success: true, tasks };
	} catch (error) {
		logger.error("❌ [WEBHOOK] Error handling checkout session completed:", error, {
			service: "webhook",
		});
		// Send immediate admin alert — payment was received but order processing failed
		try {
			const order = await prisma.order.findFirst({
				where: { id: orderId },
				select: { orderNumber: true, customerEmail: true, total: true },
			});
			const piId =
				typeof session.payment_intent === "string"
					? session.payment_intent
					: session.payment_intent?.id;
			if (order && piId) {
				await sendAdminOrderProcessingFailedAlert({
					orderNumber: order.orderNumber,
					customerEmail: order.customerEmail ?? "N/A",
					total: order.total,
					errorMessage: error instanceof Error ? error.message : String(error),
					paymentIntentId: piId,
				});
			}
		} catch (alertError) {
			logger.error("Failed to send order processing failed alert", alertError, {
				service: "webhook",
			});
		}
		throw error;
	}
}

/**
 * Gère l'expiration d'une session de checkout
 * Marque la commande comme annulée après expiration sans paiement
 */
export async function handleCheckoutSessionExpired(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult> {
	const orderId = session.metadata?.orderId ?? session.client_reference_id;

	if (!orderId) {
		logger.error("❌ [WEBHOOK] No order ID found in expired checkout session", undefined, {
			service: "webhook",
		});
		throw new Error("No order ID found in expired checkout session metadata");
	}

	logger.info(
		`⏰ [WEBHOOK] Processing expired checkout session: ${session.id}, order: ${orderId}`,
		{ service: "webhook" },
	);

	try {
		await cancelExpiredOrder(orderId);

		return {
			success: true,
			tasks: [
				{
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
				},
			],
		};
	} catch (error) {
		logger.error(
			`❌ [WEBHOOK] Error handling expired checkout session for order ${orderId}:`,
			error,
			{ service: "webhook" },
		);
		throw error;
	}
}
