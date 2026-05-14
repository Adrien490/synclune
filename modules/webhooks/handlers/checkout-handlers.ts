import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { sendAdminOrderProcessingFailedAlert } from "@/modules/emails/services/admin-emails";
import { prisma } from "@/shared/lib/prisma";

import type { WebhookHandlerResult } from "../types/webhook.types";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import { captureWebhookError } from "../utils/capture-webhook-error";
import {
	buildPostCheckoutTasks,
	cancelExpiredOrder,
	createOrderFromCheckoutSession,
	retrieveCheckoutSessionForOrder,
} from "../services/checkout.service";

/**
 * Webhook `checkout.session.completed`.
 *
 * Avec la migration vers Checkout Sessions API, c'est l'unique point d'entrée
 * de création d'un Order Synclune (auparavant l'Order était créé en amont). On
 * recharge la Session avec ses expansions pour disposer du payment_intent et
 * des shipping details, puis on délègue à `createOrderFromCheckoutSession`.
 */
export async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult | null> {
	// Pour les paiements asynchrones (SEPA, etc.), la session arrive d'abord
	// avec `payment_status: "unpaid"`. On attend le hook `async_payment_succeeded`.
	if (session.payment_status === "unpaid") {
		logger.info(
			`⏳ [WEBHOOK] Session ${session.id} payment_status is 'unpaid', waiting for async confirmation`,
			{ service: "webhook" },
		);
		return null;
	}

	try {
		const fullSession = await retrieveCheckoutSessionForOrder(session.id);
		const order = await createOrderFromCheckoutSession(fullSession);
		const tasks = buildPostCheckoutTasks(order, fullSession);

		// Anti-fraud : email Stripe vs email connu pour l'utilisateur authentifié.
		const stripeEmail = fullSession.customer_details?.email ?? fullSession.customer_email;
		if (stripeEmail && order.userId) {
			const user = await prisma.user.findUnique({
				where: { id: order.userId },
				select: { email: true },
			});
			if (user?.email && user.email.toLowerCase() !== stripeEmail.toLowerCase()) {
				logger.warn(`[WEBHOOK] Email mismatch detected for order ${order.id}`, {
					service: "webhook",
				});
				await prisma.orderNote.create({
					data: {
						orderId: order.id,
						content:
							`[ALERTE EMAIL] Email Stripe (${stripeEmail}) ne correspond pas à l'email du compte (${user.email}). ` +
							`Vérifier la légitimité de cette commande.`,
						authorId: SYSTEM_AUTHOR_ID,
						authorName: "Systeme (webhook Stripe)",
					},
				});
				tasks.push({ type: "INVALIDATE_CACHE", tags: [ORDERS_CACHE_TAGS.NOTES(order.id)] });
			}
		}

		return { success: true, tasks };
	} catch (error) {
		logger.error("❌ [WEBHOOK] Error handling checkout.session.completed:", error, {
			service: "webhook",
		});
		const piId =
			typeof session.payment_intent === "string"
				? session.payment_intent
				: (session.payment_intent?.id ?? undefined);
		captureWebhookError(error, {
			handler: "handleCheckoutSessionCompleted",
			eventType: "checkout.session.completed",
			checkoutSessionId: session.id,
			paymentIntentId: piId,
		});

		// Notif admin : Stripe a encaissé un paiement mais on a échoué à créer l'Order.
		try {
			await sendAdminOrderProcessingFailedAlert({
				orderNumber: "(non créée)",
				customerEmail: session.customer_details?.email ?? session.customer_email ?? "",
				total: session.amount_total ?? 0,
				errorMessage: error instanceof Error ? error.message : String(error),
				paymentIntentId: piId ?? "(inconnu)",
			});
		} catch (alertError) {
			logger.error("Failed to send order processing failed alert", alertError, {
				service: "webhook",
			});
		}
		throw error;
	}
}

/**
 * Webhook `checkout.session.expired`.
 *
 * Avec le nouveau flow (Order créé seulement au paiement réussi), il n'y a en
 * général aucun Order à canceller — la session expirée signifie simplement que
 * le client a abandonné avant paiement. `cancelExpiredOrder` reste appelé pour
 * gérer les éventuelles Orders rétrocompatibles encore liées à une Session.
 */
export async function handleCheckoutSessionExpired(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult> {
	logger.info(`⏰ [WEBHOOK] Checkout session expired: ${session.id}`, { service: "webhook" });

	try {
		await cancelExpiredOrder(session.id);

		return {
			success: true,
			tasks: [
				{
					type: "INVALIDATE_CACHE",
					tags: [
						ORDERS_CACHE_TAGS.LIST,
						SHARED_CACHE_TAGS.ADMIN_BADGES,
						SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
						DISCOUNT_CACHE_TAGS.LIST,
					],
				},
			],
		};
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling expired session ${session.id}:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handleCheckoutSessionExpired",
			eventType: "checkout.session.expired",
			checkoutSessionId: session.id,
		});
		throw error;
	}
}
