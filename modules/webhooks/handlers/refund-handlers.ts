import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
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
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";
import { captureWebhookError } from "../utils/capture-webhook-error";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import { HistorySource, InvoiceStatus } from "@/app/generated/prisma/client";

/**
 * Gère les remboursements (charge.refunded)
 * Synchronise les remboursements Stripe avec la base de données
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<WebhookHandlerResult> {
	logger.info(`💰 [WEBHOOK] Charge refunded: ${charge.id}`, { service: "webhook" });

	const paymentIntentId =
		typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

	try {
		if (!paymentIntentId) {
			logger.error("❌ [WEBHOOK] No payment intent found for refunded charge", undefined, {
				service: "webhook",
			});
			throw new Error("No payment intent found for refunded charge");
		}

		// 2. Trouver la commande via payment intent (exclude soft-deleted)
		const order = await prisma.order.findFirst({
			where: { stripePaymentIntentId: paymentIntentId, ...notDeleted },
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
						reason: true,
						// ORD-STRIPE-002 : utilisé par syncStripeRefunds pour détecter
						// un SAGA processRefund en cours et skip l'update concurrent.
						processedAt: true,
					},
					orderBy: { createdAt: "desc" },
				},
			},
		});

		if (!order) {
			logger.warn(`⚠️ [WEBHOOK] Order not found for payment intent ${paymentIntentId}`, {
				service: "webhook",
			});
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
		);

		logger.info(
			`📄 [WEBHOOK] Refund processed for order ${order.orderNumber} ` +
				`(${isFullyRefunded ? "total" : "partial"}: ${totalRefundedOnStripe / 100}€)`,
			{ service: "webhook" },
		);

		// 4b. Cycle VOIDED facture (Art. 272-I CGI) si remboursement total après émission.
		// Idempotent : noop si déjà VOIDED ou si pas de facture active.
		if (isFullyRefunded) {
			const invoiceState = await prisma.order.findUnique({
				where: { id: order.id },
				select: { invoiceStatus: true, invoiceNumber: true },
			});
			if (invoiceState?.invoiceStatus === InvoiceStatus.GENERATED && invoiceState.invoiceNumber) {
				await voidInvoice({
					orderId: order.id,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: "Stripe",
					source: HistorySource.WEBHOOK,
					reason: "Avoir émis suite à remboursement total Stripe",
				});
			}
		}

		// 5. Build post-tasks (email + cache invalidation)
		const tasks: PostWebhookTask[] = [];

		const cacheTags = [
			ORDERS_CACHE_TAGS.LIST,
			ORDERS_CACHE_TAGS.REFUNDS(order.id),
			SHARED_CACHE_TAGS.ADMIN_BADGES,
			SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
		];
		if (order.userId) {
			cacheTags.push(ORDERS_CACHE_TAGS.USER_ORDERS(order.userId));
		}
		tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });

		// ORD-STRIPE-001: éviter le double email confirmation refund.
		// `processRefund` (admin path) envoie déjà l'email côté action ;
		// `reconcile-refunds` (cron DLQ) idem. Le webhook ne doit envoyer que
		// pour les refunds Dashboard Stripe nouvellement détectés (aucun local
		// match préexistant). Stratégie : on émet l'email uniquement si au
		// moins un refund Stripe n'avait PAS de local Refund avec ce
		// `stripeRefundId` avant le webhook (state pré-syncStripeRefunds).
		const dashboardRefundDetected = (charge.refunds?.data ?? []).some(
			(stripeRefund) =>
				typeof stripeRefund.id === "string" &&
				!order.refunds.some((r) => r.stripeRefundId === stripeRefund.id),
		);

		if (order.customerEmail && dashboardRefundDetected) {
			// Read reason from local DB Refund (matches internal RefundReason enum
			// keys used by REFUND_REASON_LABELS in refund-confirmed-email.tsx).
			// Stripe.Refund.reason values (`requested_by_customer`, `fraudulent`...)
			// would not match the enum and produce an empty label.
			const latestLocalRefund = order.refunds[0];
			const reason = latestLocalRefund?.reason ?? "OTHER";
			const baseUrl = getBaseUrl();
			const orderDetailsUrl = `${baseUrl}${ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)}`;

			tasks.push({
				type: "REFUND_CONFIRMATION_EMAIL",
				data: {
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					refundAmount: totalRefundedOnStripe,
					reason,
					orderDetailsUrl,
					// ORD-STRIPE-008 : dedup cross-instance Resend 24h sur retries
					// webhook ou rejouent cron retry-webhooks.
					idempotencyKey: `refund-confirm-charge-${charge.id}-${totalRefundedOnStripe}`,
				},
			});
		}

		return { success: true, tasks };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling charge refunded:`, error, { service: "webhook" });
		captureWebhookError(error, {
			handler: "handleChargeRefunded",
			eventType: "charge.refunded",
			stripeChargeId: charge.id,
			paymentIntentId,
		});
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
	logger.info(`💰 [WEBHOOK] Refund updated: ${stripeRefund.id}, status: ${stripeRefund.status}`, {
		service: "webhook",
	});

	try {
		// 1. Trouver le remboursement local
		const refund = await resolveRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined,
		);

		if (!refund) {
			logger.info(
				`ℹ️ [WEBHOOK] Refund ${stripeRefund.id} not found in database (may be external)`,
				{ service: "webhook" },
			);
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
		logger.error(`❌ [WEBHOOK] Error handling refund updated:`, error, { service: "webhook" });
		captureWebhookError(error, {
			handler: "handleRefundUpdated",
			eventType: "refund.updated",
			stripeRefundId: stripeRefund.id,
		});
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
	logger.info(`❌ [WEBHOOK] Refund failed: ${stripeRefund.id}`, { service: "webhook" });

	try {
		// 1. Trouver le remboursement local
		const refund = await resolveRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined,
		);

		if (!refund) {
			logger.warn(`⚠️ [WEBHOOK] Failed refund ${stripeRefund.id} not found in database`, {
				service: "webhook",
			});
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
		const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.REFUNDS}`;
		tasks.push({
			type: "ADMIN_REFUND_FAILED_ALERT",
			data: {
				orderNumber: refund.order.orderNumber,
				customerEmail: refund.order.customerEmail ?? "Email non disponible",
				amount: refund.amount,
				reason: "other",
				refundReason: refund.reason,
				errorMessage: `Échec remboursement Stripe: ${failureReason}`,
				stripePaymentIntentId: refund.order.stripePaymentIntentId ?? "",
				dashboardUrl,
			},
		});

		return { success: true, tasks };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling refund failed:`, error, { service: "webhook" });
		captureWebhookError(error, {
			handler: "handleRefundFailed",
			eventType: "refund.failed",
			stripeRefundId: stripeRefund.id,
		});
		throw error;
	}
}
