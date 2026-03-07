import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import {
	markOrderAsPaid,
	extractPaymentFailureDetails,
	restoreStockForOrder,
	markOrderAsFailed,
	markOrderAsCancelled,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "../services/payment-intent.service";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import type { WebhookHandlerResult } from "../types/webhook.types";

/**
 * Gère le succès d'un paiement via Payment Intent
 * NOTE: Ce handler ne gère pas les emails car checkout.session.completed le fait déjà
 */
export async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		// Log pour debugging - pas d'erreur car certains PaymentIntent n'ont pas d'order_id (ex: paiements hors checkout)
		logger.warn(
			`⚠️ [WEBHOOK] payment_intent.succeeded without order_id in metadata (PI: ${paymentIntent.id})`,
			{ service: "webhook" },
		);
		return;
	}

	await markOrderAsPaid(orderId, paymentIntent.id);
}

/**
 * Gère l'échec d'un paiement
 * Restaure le stock réservé et initie un remboursement si nécessaire
 */
export async function handlePaymentFailure(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		logger.error("❌ [WEBHOOK] No order_id in payment intent metadata", undefined, {
			service: "webhook",
		});
		throw new Error("No order_id in payment intent metadata");
	}

	try {
		// 1. Extraire les détails d'échec
		const failureDetails = extractPaymentFailureDetails(paymentIntent);

		logger.info(`[AUDIT] Payment failure detected`, {
			service: "webhook",
			orderId,
			failureCode: failureDetails.code,
		});

		// 2. Restaurer le stock si nécessaire
		const { restoredSkuIds } = await restoreStockForOrder(orderId);

		// 3. Marquer la commande comme échouée
		await markOrderAsFailed(orderId, paymentIntent.id, failureDetails);

		// 4. Remboursement automatique si de l'argent a été capturé
		if (paymentIntent.amount_received > 0) {
			logger.info(
				`💰 [WEBHOOK] Initiating automatic refund for order ${orderId} (${paymentIntent.amount_received} cents captured)`,
				{ service: "webhook" },
			);

			const refundResult = await initiateAutomaticRefund(
				paymentIntent.id,
				orderId,
				"Payment failed, automatic refund",
			);

			if (!refundResult.success && refundResult.error) {
				await sendRefundFailureAlert(
					orderId,
					paymentIntent.id,
					"payment_failed",
					refundResult.error.message,
				);
			}
		}

		logger.info(`❌ [WEBHOOK] Order ${orderId} payment failed`, { service: "webhook" });

		// 5. Build cache invalidation tasks
		const cacheTags: string[] = [
			ORDERS_CACHE_TAGS.LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
			SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
			DASHBOARD_CACHE_TAGS.KPIS,
			DASHBOARD_CACHE_TAGS.REVENUE_CHART,
			DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
		];
		for (const skuId of restoredSkuIds) {
			cacheTags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
		}

		return {
			success: true,
			tasks: [{ type: "INVALIDATE_CACHE", tags: cacheTags }],
		};
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling payment failure for order ${orderId}:`, error, {
			service: "webhook",
		});
		throw error;
	}
}

/**
 * Gère l'annulation d'un paiement
 * Annule la commande et initie un remboursement si nécessaire
 */
export async function handlePaymentCanceled(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = paymentIntent.metadata.order_id;

	if (!orderId) {
		logger.error("❌ [WEBHOOK] No order_id in payment intent metadata", undefined, {
			service: "webhook",
		});
		throw new Error("No order_id in payment intent metadata");
	}

	try {
		// 1. Restore stock if it was decremented (order was PROCESSING/PAID)
		const { restoredSkuIds } = await restoreStockForOrder(orderId);

		// 2. Marquer la commande comme annulée
		await markOrderAsCancelled(orderId, paymentIntent.id);

		// 3. Remboursement automatique si paiement a été capturé
		if (paymentIntent.status === "canceled" && paymentIntent.amount_received > 0) {
			logger.info(`💰 [WEBHOOK] Initiating automatic refund for canceled order ${orderId}`, {
				service: "webhook",
			});

			const refundResult = await initiateAutomaticRefund(
				paymentIntent.id,
				orderId,
				"Payment canceled, automatic refund",
			);

			if (!refundResult.success && refundResult.error) {
				await sendRefundFailureAlert(
					orderId,
					paymentIntent.id,
					"payment_canceled",
					refundResult.error.message,
				);
			}
		}

		logger.info(`⚠️ [WEBHOOK] Order ${orderId} payment canceled`, { service: "webhook" });

		// 4. Build cache invalidation tasks
		const cacheTags: string[] = [
			ORDERS_CACHE_TAGS.LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
			SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
			DASHBOARD_CACHE_TAGS.KPIS,
			DASHBOARD_CACHE_TAGS.REVENUE_CHART,
			DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
		];
		for (const skuId of restoredSkuIds) {
			cacheTags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
		}

		return {
			success: true,
			tasks: [
				{
					type: "INVALIDATE_CACHE",
					tags: cacheTags,
				},
			],
		};
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling payment cancelation for order ${orderId}:`, error, {
			service: "webhook",
		});
		throw error;
	}
}

/**
 * Handles invoice payment failure
 *
 * When invoice_creation.enabled is true in checkout, Stripe creates invoices.
 * If a payment retry on those invoices fails, this handler sends an admin alert.
 */
export async function handleInvoicePaymentFailed(
	invoice: Stripe.Invoice,
): Promise<WebhookHandlerResult> {
	// Try to find the related order via invoice metadata or customer email
	const orderId = invoice.metadata?.orderId;
	const order = orderId
		? await prisma.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					customerEmail: true,
					stripePaymentIntentId: true,
				},
			})
		: null;

	const orderNumber = order?.orderNumber ?? invoice.number ?? "N/A";
	const customerEmail = order?.customerEmail ?? invoice.customer_email ?? "N/A";
	const amount = invoice.amount_due || 0;

	// Extract error message from the invoice
	const errorMessage =
		invoice.last_finalization_error?.message ??
		`Invoice payment failed (status: ${invoice.status})`;

	const dashboardUrl = order
		? buildUrl(ROUTES.ADMIN.ORDER_DETAIL(order.id))
		: buildUrl(ROUTES.ADMIN.ORDERS);

	logger.info(`❌ [WEBHOOK] Invoice payment failed for order ${orderNumber} (${amount} cents)`, {
		service: "webhook",
	});

	return {
		success: true,
		tasks: [
			{
				type: "ADMIN_INVOICE_FAILED_ALERT",
				data: {
					orderNumber,
					customerEmail,
					amount,
					errorMessage,
					stripePaymentIntentId: order?.stripePaymentIntentId ?? undefined,
					dashboardUrl,
				},
			},
			{
				type: "INVALIDATE_CACHE",
				tags: [
					ORDERS_CACHE_TAGS.LIST,
					SHARED_CACHE_TAGS.ADMIN_BADGES,
					SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
					DASHBOARD_CACHE_TAGS.KPIS,
					DASHBOARD_CACHE_TAGS.REVENUE_CHART,
					DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
				],
			},
		],
	};
}
