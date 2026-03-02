import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { handleCheckoutSessionCompleted } from "./checkout-handlers";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { getBaseUrl } from "@/shared/constants/urls";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";

/**
 * Gère les paiements asynchrones réussis (SEPA, Sofort, etc.)
 * Ces paiements sont confirmés après le checkout, parfois plusieurs jours plus tard
 */
export async function handleAsyncPaymentSucceeded(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult | null> {
	logger.info(`🏦 [WEBHOOK] Async payment succeeded: ${session.id}`, { service: "webhook" });

	try {
		const orderId = session.metadata?.orderId ?? session.client_reference_id;

		if (!orderId) {
			logger.error("❌ [WEBHOOK] No order ID found in async payment session", undefined, {
				service: "webhook",
			});
			throw new Error("No order ID found in async payment session metadata");
		}

		// Traiter comme un checkout.session.completed
		// La logique est identique : mettre à jour le statut, décrémenter le stock, etc.
		const result = await handleCheckoutSessionCompleted(session);

		logger.info(`✅ [WEBHOOK] Async payment processed for order ${orderId}`, {
			service: "webhook",
		});
		return result;
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling async payment succeeded:`, error, {
			service: "webhook",
		});
		throw error;
	}
}

/**
 * Gère les paiements asynchrones échoués
 * Annule la commande et notifie le client
 */
export async function handleAsyncPaymentFailed(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult> {
	logger.info(`🚫 [WEBHOOK] Async payment failed: ${session.id}`, { service: "webhook" });

	try {
		const orderId = session.metadata?.orderId ?? session.client_reference_id;

		if (!orderId) {
			logger.error("❌ [WEBHOOK] No order ID found in failed async payment session", undefined, {
				service: "webhook",
			});
			throw new Error("No order ID found in failed async payment session metadata");
		}

		// Idempotence: if async_payment_succeeded arrived first, don't overwrite PAID
		const existingOrder = await prisma.order.findUnique({
			where: { id: orderId },
			select: { paymentStatus: true },
		});

		if (!existingOrder) {
			throw new Error(`Order not found: ${orderId}`);
		}

		if (
			existingOrder.paymentStatus === "PAID" ||
			existingOrder.paymentStatus === "REFUNDED" ||
			existingOrder.paymentStatus === "PARTIALLY_REFUNDED" ||
			existingOrder.paymentStatus === "EXPIRED"
		) {
			logger.info(
				`⏭️ [WEBHOOK] Order ${orderId} already ${existingOrder.paymentStatus}, skipping async payment failure`,
				{ service: "webhook" },
			);
			return {
				success: true,
				skipped: true,
				reason: `Order already ${existingOrder.paymentStatus}`,
			};
		}

		// Cancel order + release discount usages in a single transaction
		const { order, releasedDiscountIds } = await prisma.$transaction(
			async (tx) => {
				// Release discount usages
				const discountUsages = await tx.discountUsage.findMany({
					where: { orderId },
					select: { id: true, discountId: true },
				});

				for (const usage of discountUsages) {
					await tx.discount.update({
						where: { id: usage.discountId },
						data: { usageCount: { decrement: 1 } },
					});
				}

				if (discountUsages.length > 0) {
					await tx.discountUsage.deleteMany({ where: { orderId } });
					logger.info(
						`[WEBHOOK] Released ${discountUsages.length} discount usage(s) for failed async order ${orderId}`,
						{ service: "webhook" },
					);
				}

				const updatedOrder = await tx.order.update({
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

				return {
					order: updatedOrder,
					releasedDiscountIds: discountUsages.map((u) => u.discountId),
				};
			},
			{ timeout: 10000 },
		);

		logger.info(
			`⚠️ [WEBHOOK] Order ${order.orderNumber} marked as FAILED due to async payment failure`,
			{ service: "webhook" },
		);

		// Build post-tasks (email + cache invalidation)
		const tasks: PostWebhookTask[] = [];

		// Collect discount tags for released usages
		const discountTags: string[] = [];
		if (releasedDiscountIds.length > 0) {
			discountTags.push(DISCOUNT_CACHE_TAGS.LIST);
			for (const discountId of releasedDiscountIds) {
				discountTags.push(DISCOUNT_CACHE_TAGS.USAGE(discountId));
			}
		}

		tasks.push({
			type: "INVALIDATE_CACHE",
			tags: [
				ORDERS_CACHE_TAGS.LIST,
				SHARED_CACHE_TAGS.ADMIN_BADGES,
				SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
				DASHBOARD_CACHE_TAGS.KPIS,
				DASHBOARD_CACHE_TAGS.REVENUE_CHART,
				DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
				...discountTags,
			],
		});

		if (order.customerEmail) {
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
		}

		return { success: true, tasks };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling async payment failed:`, error, {
			service: "webhook",
		});
		throw error;
	}
}
