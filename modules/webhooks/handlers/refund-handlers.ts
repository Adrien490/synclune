import type Stripe from "stripe";
import { prisma } from "@/shared/lib/prisma";
import {
	syncStripeRefunds,
	updateOrderPaymentStatus,
	resolveRefundByStripeId,
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
} from "../services/refund.service";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";

/**
 * Gère les remboursements (charge.refunded)
 * Synchronise les remboursements Stripe avec la base de données
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<WebhookHandlerResult> {
	console.log(`💰 [WEBHOOK] Charge refunded: ${charge.id}`);

	try {
		// 1. Récupérer le payment intent associé
		const paymentIntentId =
			typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

		if (!paymentIntentId) {
			console.error("❌ [WEBHOOK] No payment intent found for refunded charge");
			throw new Error("No payment intent found for refunded charge");
		}

		// 2. Trouver la commande via payment intent
		const order = await prisma.order.findUnique({
			where: { stripePaymentIntentId: paymentIntentId },
			select: {
				id: true,
				orderNumber: true,
				total: true,
				paymentStatus: true,
				customerEmail: true,
				customerName: true,
				userId: true,
				refunds: {
					select: {
						id: true,
						amount: true,
						status: true,
						stripeRefundId: true,
					},
				},
			},
		});

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for payment intent ${paymentIntentId}`);
			return { success: true, skipped: true, reason: "Order not found" };
		}

		// 3. Synchroniser les remboursements Stripe avec la base
		await syncStripeRefunds(charge, order.refunds, order.id);

		// 4. Mettre à jour le statut de paiement de la commande
		const totalRefundedOnStripe = charge.amount_refunded || 0;
		const { isFullyRefunded } = await updateOrderPaymentStatus(
			order.id,
			order.total,
			totalRefundedOnStripe,
			order.paymentStatus,
		);

		console.log(
			`📄 [WEBHOOK] Refund processed for order ${order.orderNumber} ` +
				`(${isFullyRefunded ? "total" : "partial"}: ${totalRefundedOnStripe / 100}€)`,
		);

		// 5. Build post-tasks (email + cache invalidation)
		const tasks: PostWebhookTask[] = [];

		const cacheTags = [
			ORDERS_CACHE_TAGS.LIST,
			ORDERS_CACHE_TAGS.REFUNDS(order.id),
			SHARED_CACHE_TAGS.ADMIN_BADGES,
			SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
			DASHBOARD_CACHE_TAGS.KPIS,
			DASHBOARD_CACHE_TAGS.REVENUE_CHART,
			DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
		];
		if (order.userId) {
			cacheTags.push(ORDERS_CACHE_TAGS.USER_ORDERS(order.userId));
		}
		tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });

		if (order.customerEmail) {
			const stripeRefunds = charge.refunds?.data ?? [];
			const latestRefund = stripeRefunds.length > 0 ? stripeRefunds[0] : undefined;
			const reason = latestRefund?.reason ?? "OTHER";
			const baseUrl = getBaseUrl();
			const orderDetailsUrl = `${baseUrl}${ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)}`;

			tasks.push({
				type: "REFUND_CONFIRMATION_EMAIL",
				data: {
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					refundAmount: totalRefundedOnStripe,
					originalOrderTotal: order.total,
					reason: reason.toUpperCase(),
					isPartialRefund: !isFullyRefunded,
					orderDetailsUrl,
				},
			});
		}

		return { success: true, tasks };
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling charge refunded:`, error);
		throw error;
	}
}

/**
 * Gère les événements refund.created et refund.updated
 * Synchronise le statut du remboursement avec la base de données
 */
export async function handleRefundUpdated(
	stripeRefund: Stripe.Refund,
): Promise<WebhookHandlerResult> {
	console.log(`💰 [WEBHOOK] Refund updated: ${stripeRefund.id}, status: ${stripeRefund.status}`);

	try {
		// 1. Trouver le remboursement local
		const refund = await resolveRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined,
		);

		if (!refund) {
			console.log(`ℹ️ [WEBHOOK] Refund ${stripeRefund.id} not found in database (may be external)`);
			return { success: true, skipped: true, reason: "Refund not found in database" };
		}

		// 2. Mapper le statut Stripe vers notre statut
		const newStatus = mapStripeRefundStatus(stripeRefund.status ?? undefined);

		// 3. Mettre à jour si le statut a changé
		if (refund.status !== newStatus) {
			await updateRefundStatus(
				refund.id,
				newStatus,
				stripeRefund.status ?? "unknown",
				refund.status,
			);

			return {
				success: true,
				tasks: [
					{
						type: "INVALIDATE_CACHE",
						tags: [ORDERS_CACHE_TAGS.REFUNDS(refund.orderId)],
					},
				],
			};
		}

		return { success: true };
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund updated:`, error);
		throw error;
	}
}

/**
 * Gère les échecs de remboursement
 * Marque le remboursement comme FAILED et alerte l'admin
 */
export async function handleRefundFailed(
	stripeRefund: Stripe.Refund,
): Promise<WebhookHandlerResult> {
	console.log(`❌ [WEBHOOK] Refund failed: ${stripeRefund.id}`);

	try {
		// 1. Trouver le remboursement local
		const refund = await resolveRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined,
		);

		if (!refund) {
			console.warn(`⚠️ [WEBHOOK] Failed refund ${stripeRefund.id} not found in database`);
			return { success: true, skipped: true, reason: "Refund not found in database" };
		}

		// 2. Marquer comme FAILED
		const failureReason = stripeRefund.failure_reason ?? "unknown";
		await markRefundAsFailed(refund.id, failureReason);

		// 3. Build post-tasks (admin alert + cache invalidation)
		const tasks: PostWebhookTask[] = [];

		tasks.push({
			type: "INVALIDATE_CACHE",
			tags: [ORDERS_CACHE_TAGS.REFUNDS(refund.orderId)],
		});

		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}/admin/ventes/remboursements`;
		tasks.push({
			type: "ADMIN_REFUND_FAILED_ALERT",
			data: {
				orderNumber: refund.order.orderNumber,
				customerEmail: refund.order.customerEmail ?? "Email non disponible",
				amount: refund.amount,
				reason: "other",
				errorMessage: `Échec remboursement Stripe: ${failureReason}`,
				stripePaymentIntentId: refund.order.stripePaymentIntentId ?? "",
				dashboardUrl,
			},
		});

		return { success: true, tasks };
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund failed:`, error);
		throw error;
	}
}
