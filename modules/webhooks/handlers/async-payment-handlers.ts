import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";
import { captureWebhookError } from "../utils/capture-webhook-error";
import { handleCheckoutSessionCompleted } from "./checkout-handlers";

/**
 * Webhook `checkout.session.async_payment_succeeded`.
 *
 * Paiements asynchrones (SEPA, Bancontact, virements). Stripe envoie d'abord
 * `checkout.session.completed` avec `payment_status: "unpaid"` (qu'on ignore),
 * puis ce hook une fois le paiement confirmé — on traite alors comme un
 * checkout standard et l'Order est créé.
 */
export async function handleAsyncPaymentSucceeded(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult | null> {
	logger.info(`🏦 [WEBHOOK] Async payment succeeded: ${session.id}`, { service: "webhook" });

	try {
		// Force `payment_status` à "paid" pour que le handler standard ne court-circuite pas.
		const sessionForCompletion: Stripe.Checkout.Session = {
			...session,
			payment_status: "paid",
		};
		return await handleCheckoutSessionCompleted(sessionForCompletion);
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling async payment succeeded:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handleAsyncPaymentSucceeded",
			eventType: "checkout.session.async_payment_succeeded",
			checkoutSessionId: session.id,
		});
		throw error;
	}
}

type AsyncPaymentFailedTxResult =
	| { skipped: true; reason: string }
	| {
			skipped: false;
			order: {
				id: string;
				orderNumber: string;
				customerEmail: string;
				customerName: string;
			};
			releasedDiscountIds: string[];
	  };

/**
 * Webhook `checkout.session.async_payment_failed`.
 *
 * Paiement async refusé/échoué après plusieurs jours. Si un Order a été créé
 * (cas rare avec le nouveau flow — uniquement pour les rétrocompat), on le
 * marque FAILED + on libère les usages de discount. Sinon, rien à faire :
 * l'Order n'a jamais été créé.
 */
export async function handleAsyncPaymentFailed(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult> {
	logger.info(`🚫 [WEBHOOK] Async payment failed: ${session.id}`, { service: "webhook" });

	try {
		const txResult = await prisma.$transaction(
			async (tx): Promise<AsyncPaymentFailedTxResult> => {
				const existingOrder = await tx.order.findUnique({
					where: { stripeCheckoutSessionId: session.id },
					select: {
						id: true,
						orderNumber: true,
						paymentStatus: true,
						customerEmail: true,
						customerName: true,
					},
				});

				if (!existingOrder) {
					return { skipped: true, reason: "no_order_yet" };
				}

				if (
					existingOrder.paymentStatus === "PAID" ||
					existingOrder.paymentStatus === "REFUNDED" ||
					existingOrder.paymentStatus === "PARTIALLY_REFUNDED" ||
					existingOrder.paymentStatus === "EXPIRED"
				) {
					return { skipped: true, reason: `already_${existingOrder.paymentStatus}` };
				}

				const discountUsages = await tx.discountUsage.findMany({
					where: { orderId: existingOrder.id },
					select: { id: true, discountId: true },
				});
				for (const usage of discountUsages) {
					await tx.discount.update({
						where: { id: usage.discountId },
						data: { usageCount: { decrement: 1 } },
					});
				}
				if (discountUsages.length > 0) {
					await tx.discountUsage.deleteMany({ where: { orderId: existingOrder.id } });
				}

				const updatedOrder = await tx.order.update({
					where: { id: existingOrder.id },
					data: { paymentStatus: PaymentStatus.FAILED, status: "CANCELLED" },
					select: {
						id: true,
						orderNumber: true,
						customerEmail: true,
						customerName: true,
					},
				});

				return {
					skipped: false,
					order: updatedOrder,
					releasedDiscountIds: discountUsages.map((u) => u.discountId),
				};
			},
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		if (txResult.skipped) {
			logger.info(`⏭️ [WEBHOOK] Async payment failure skipped: ${txResult.reason}`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: txResult.reason };
		}

		const { order, releasedDiscountIds } = txResult;
		const tasks: PostWebhookTask[] = [];

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
				...discountTags,
			],
		});

		if (order.customerEmail) {
			tasks.push({
				type: "PAYMENT_FAILED_EMAIL",
				data: {
					to: order.customerEmail,
					customerName: order.customerName,
					orderNumber: order.orderNumber,
					retryUrl: `${getBaseUrl()}${ROUTES.SHOP.CHECKOUT}`,
				},
			});
		}

		return { success: true, tasks };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling async payment failed:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handleAsyncPaymentFailed",
			eventType: "checkout.session.async_payment_failed",
			checkoutSessionId: session.id,
		});
		throw error;
	}
}
