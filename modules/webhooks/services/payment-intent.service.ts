import type Stripe from "stripe";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import {
	type Prisma,
	HistorySource,
	OrderAction,
	type PaymentMethod,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { releaseOrderDiscountUsageTx } from "@/modules/discounts/services/release-order-discount-usage.service";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import type { PaymentFailureDetails } from "../types/webhook.types";

const AUTO_REFUND_NOTE_PREFIX = "Auto-refund payment_failed webhook";

// Re-export types for backwards compatibility
export type { PaymentFailureDetails };

/**
 * @deprecated ORD-STRIPE-001 / ORD-STRIPE-002 (2026-05-28) — NE PAS UTILISER en
 *   nouveau code. Cette fonction marque `paymentStatus=PAID` mais ne décrémente
 *   PAS le stock et ne désactive PAS les SKUs épuisés. Si elle est appelée avant
 *   `processOrderTransaction` / `processOrderFromPaymentIntent`, le guard
 *   `paymentStatus === "PAID"` (checkout-order-processing.service.ts:114) court-
 *   circuite tout décrément ultérieur → oversell silencieux. Utiliser
 *   `processOrderFromPaymentIntent` à la place : idempotent + décrément + clear
 *   cart + désactivation SKUs en une seule transaction.
 *
 * Conservée uniquement pour rétro-compat des tests d'idempotence existants.
 * Tout nouveau call-site doit être refusé en review.
 */
export async function markOrderAsPaid(
	orderId: string,
	paymentIntentId: string,
	paymentMethod?: PaymentMethod,
): Promise<void> {
	await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			// Vérification d'idempotence
			const order = await tx.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: { status: true, paymentStatus: true },
			});

			if (!order) {
				logger.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsPaid`, undefined, {
					service: "webhook",
				});
				return;
			}

			if (order.paymentStatus === "PAID") {
				logger.info(`⏭️ [WEBHOOK] Order ${orderId} already marked as PAID, skipping`, {
					service: "webhook",
				});
				return;
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "PROCESSING",
					paymentStatus: "PAID",
					stripePaymentIntentId: paymentIntentId,
					paidAt: new Date(),
					...(paymentMethod !== undefined && { paymentMethod }),
				},
			});

			await createOrderAuditTx(tx, {
				orderId,
				action: OrderAction.PAID,
				previousStatus: order.status,
				newStatus: "PROCESSING",
				previousPaymentStatus: order.paymentStatus,
				newPaymentStatus: "PAID",
				authorName: "Stripe",
				source: HistorySource.WEBHOOK,
				metadata: { paymentIntentId },
			});

			logger.info(`✅ [WEBHOOK] Order ${orderId} marked as PAID via payment_intent.succeeded`, {
				service: "webhook",
			});
		},
		// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}

/**
 * Extrait les détails d'échec d'un PaymentIntent
 */
export function extractPaymentFailureDetails(
	paymentIntent: Stripe.PaymentIntent,
): PaymentFailureDetails {
	const lastError = paymentIntent.last_payment_error;
	return {
		code: lastError?.code ?? null,
		declineCode: lastError?.decline_code ?? null,
		message: lastError?.message ?? null,
	};
}

/**
 * Restaure le stock pour une commande dont le paiement a échoué
 */
export async function restoreStockForOrder(
	orderId: string,
): Promise<{ shouldRestore: boolean; itemCount: number; restoredSkuIds: string[] }> {
	// All reads and writes inside the transaction to prevent double restoration on concurrent retries
	return prisma.$transaction(
		async (tx) => {
			const order = await tx.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
						},
					},
				},
			});

			if (!order) {
				logger.error(`[WEBHOOK] Order ${orderId} not found for stock restoration`, undefined, {
					service: "webhook",
				});
				return { shouldRestore: false, itemCount: 0, restoredSkuIds: [] };
			}

			// Only restore if stock was decremented (PROCESSING status = payment had succeeded)
			const shouldRestore = order.status === "PROCESSING" || order.paymentStatus === "PAID";

			if (!shouldRestore || order.items.length === 0) {
				return { shouldRestore: false, itemCount: 0, restoredSkuIds: [] };
			}

			// Group quantities by skuId in case multiple items share the same SKU
			const stockUpdates = new Map<string, number>();
			for (const item of order.items) {
				const current = stockUpdates.get(item.skuId) ?? 0;
				stockUpdates.set(item.skuId, current + item.quantity);
			}

			// Fetch current SKU states to determine if reactivation is appropriate
			const skuIds = Array.from(stockUpdates.keys());
			const skus = await tx.productSku.findMany({
				where: { id: { in: skuIds } },
				select: { id: true, inventory: true, isActive: true },
			});
			const skuMap = new Map(skus.map((s) => [s.id, s]));

			await Promise.all(
				Array.from(stockUpdates.entries()).map(([skuId, quantity]) => {
					const sku = skuMap.get(skuId);
					// Only reactivate if the SKU was auto-deactivated (inventory === 0 and inactive)
					// Don't reactivate SKUs that were manually deactivated by admin (inventory > 0 but inactive)
					const shouldReactivate = sku && !sku.isActive && sku.inventory === 0;

					return tx.productSku.update({
						where: { id: skuId },
						data: {
							inventory: { increment: quantity },
							...(shouldReactivate && { isActive: true }),
						},
					});
				}),
			);

			logger.info(
				`[WEBHOOK] Stock restored for ${order.items.length} items on order ${order.orderNumber}`,
				{ service: "webhook" },
			);
			return { shouldRestore: true, itemCount: order.items.length, restoredSkuIds: skuIds };
		},
		// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}

/**
 * Met à jour une commande comme échouée avec les détails d'erreur
 * Idempotent: if the order is already FAILED, the operation is skipped.
 *
 * Libère également le code promo attaché (cf [[CHECKOUT-AUDIT-001]]) : décrémente
 * `Discount.usageCount` et supprime les `DiscountUsage` orphelines, sinon le
 * compteur dérive à chaque paiement échoué.
 */
export async function markOrderAsFailed(
	orderId: string,
	paymentIntentId: string,
	failureDetails: PaymentFailureDetails,
): Promise<void> {
	const releasedDiscountIds = await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			const order = await tx.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: { status: true, paymentStatus: true },
			});

			if (!order) {
				logger.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsFailed`, undefined, {
					service: "webhook",
				});
				return [];
			}

			if (order.paymentStatus === "FAILED") {
				logger.info(`⏭️ [WEBHOOK] Order ${orderId} already marked as FAILED, skipping`, {
					service: "webhook",
				});
				return [];
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					paymentStatus: "FAILED",
					status: "CANCELLED",
					stripePaymentIntentId: paymentIntentId,
					paymentFailureCode: failureDetails.code,
					paymentDeclineCode: failureDetails.declineCode,
					paymentFailureMessage: failureDetails.message,
				},
			});

			const discountIds = await releaseOrderDiscountUsageTx(tx, orderId);

			await createOrderAuditTx(tx, {
				orderId,
				action: OrderAction.CANCELLED,
				previousStatus: order.status,
				newStatus: "CANCELLED",
				previousPaymentStatus: order.paymentStatus,
				newPaymentStatus: "FAILED",
				authorName: "Stripe",
				source: HistorySource.WEBHOOK,
				metadata: {
					paymentIntentId,
					failureCode: failureDetails.code,
					declineCode: failureDetails.declineCode,
					failureMessage: failureDetails.message,
					releasedDiscountsCount: discountIds.length,
				},
			});

			logger.info(`❌ [WEBHOOK] Order ${orderId} marked as FAILED`, { service: "webhook" });
			return discountIds;
		},
		// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	for (const discountId of releasedDiscountIds) {
		updateTag(DISCOUNT_CACHE_TAGS.USAGE(discountId));
	}
}

/**
 * Marque une commande comme annulée
 * Idempotent: if the order is already CANCELLED with FAILED payment, the operation is skipped.
 *
 * Libère également le code promo attaché (cf [[CHECKOUT-AUDIT-001]]).
 */
export async function markOrderAsCancelled(
	orderId: string,
	paymentIntentId: string,
): Promise<void> {
	const releasedDiscountIds = await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			const order = await tx.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: { status: true, paymentStatus: true },
			});

			if (!order) {
				logger.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsCancelled`, undefined, {
					service: "webhook",
				});
				return [];
			}

			if (order.status === "CANCELLED" && order.paymentStatus === "FAILED") {
				logger.info(
					`⏭️ [WEBHOOK] Order ${orderId} already CANCELLED with FAILED payment, skipping`,
					{ service: "webhook" },
				);
				return [];
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "CANCELLED",
					paymentStatus: "FAILED",
					stripePaymentIntentId: paymentIntentId,
				},
			});

			const discountIds = await releaseOrderDiscountUsageTx(tx, orderId);

			await createOrderAuditTx(tx, {
				orderId,
				action: OrderAction.CANCELLED,
				previousStatus: order.status,
				newStatus: "CANCELLED",
				previousPaymentStatus: order.paymentStatus,
				newPaymentStatus: "FAILED",
				authorName: "Stripe",
				source: HistorySource.WEBHOOK,
				metadata: {
					paymentIntentId,
					reason: "payment_intent.canceled",
					releasedDiscountsCount: discountIds.length,
				},
			});

			logger.info(`❌ [WEBHOOK] Order ${orderId} marked as CANCELLED`, { service: "webhook" });
			return discountIds;
		},
		// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	for (const discountId of releasedDiscountIds) {
		updateTag(DISCOUNT_CACHE_TAGS.USAGE(discountId));
	}
}

/**
 * Initie un remboursement automatique via Stripe.
 *
 * ORD-BIZ-002 : crée un `Refund` local APPROVED (avec `RefundItems` couvrant
 * tous les OrderItem, `restock=false` car le stock est déjà restauré par
 * `restoreStockForOrder` lors de `payment_failed`) AVANT l'appel Stripe.
 * `metadata.refund_id = localRefund.id` permet au webhook `charge.refunded`
 * de matcher via la branche `linkRefund` (et non `upsertDashboard`), donc
 * d'éviter la perte de traçabilité items côté DB.
 *
 * Idempotent : si un Refund auto a déjà été créé pour cet ordre + paymentIntent,
 * on le re-utilise (la clé d'idempotence Stripe garantit le même `re_*` Stripe).
 */
export async function initiateAutomaticRefund(
	paymentIntentId: string,
	orderId: string,
	reason: string,
): Promise<{ success: boolean; refundId?: string; error?: Error }> {
	try {
		const localRefund = await prisma.$transaction(
			async (tx) => {
				const existing = await tx.refund.findFirst({
					where: {
						orderId,
						note: { startsWith: AUTO_REFUND_NOTE_PREFIX },
						status: { notIn: [RefundStatus.CANCELLED, RefundStatus.REJECTED] },
						...notDeleted,
					},
					select: { id: true, status: true, stripeRefundId: true },
				});
				if (existing) return existing;

				const order = await tx.order.findUniqueOrThrow({
					where: { id: orderId },
					select: {
						total: true,
						items: { select: { id: true, price: true, quantity: true } },
					},
				});

				const created = await tx.refund.create({
					data: {
						orderId,
						amount: order.total,
						currency: "EUR",
						reason: RefundReason.OTHER,
						status: RefundStatus.APPROVED,
						note: `${AUTO_REFUND_NOTE_PREFIX} (${reason})`,
						items: {
							create: order.items.map((oi) => ({
								orderItemId: oi.id,
								quantity: oi.quantity,
								amount: oi.price * oi.quantity,
								restock: false,
							})),
						},
					},
					select: { id: true, status: true, stripeRefundId: true },
				});

				await createOrderAuditTx(tx, {
					orderId,
					action: OrderAction.REFUND_CREATED,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: "Système (auto-refund)",
					note: `Auto-refund initié suite à ${reason}`,
					metadata: {
						refundId: created.id,
						paymentIntentId,
						amount: order.total,
						itemsCount: order.items.length,
						automatic: true,
					},
				});

				return created;
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		const { stripe } = await import("@/shared/lib/stripe");

		const refund = await stripe.refunds.create(
			{
				payment_intent: paymentIntentId,
				reason: "requested_by_customer",
				metadata: {
					orderId,
					reason,
					refund_id: localRefund.id,
				},
			},
			{
				idempotencyKey: `auto-refund-${paymentIntentId}`,
			},
		);

		// Persiste stripeRefundId si pas déjà posé. Le webhook charge.refunded
		// tombera ensuite sur la branche `linkRefund` (refund_id présent dans
		// metadata) et finalisera le status à COMPLETED dans le même flux.
		if (!localRefund.stripeRefundId) {
			await prisma.refund.update({
				where: { id: localRefund.id },
				data: { stripeRefundId: refund.id },
			});
		}

		logger.info(
			`✅ [WEBHOOK] Auto-refund Stripe ${refund.id} créé + lié au Refund local ${localRefund.id} pour ordre ${orderId}`,
			{ service: "webhook" },
		);
		return { success: true, refundId: refund.id };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Failed to create auto-refund for order ${orderId}:`, error, {
			service: "webhook",
		});
		return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
	}
}

/**
 * Envoie une alerte admin pour un échec de remboursement
 */
export async function sendRefundFailureAlert(
	orderId: string,
	paymentIntentId: string,
	reason: "payment_failed" | "payment_canceled" | "other",
	errorMessage: string,
): Promise<void> {
	try {
		const order = await prisma.order.findFirst({
			where: { id: orderId, ...notDeleted },
			select: {
				orderNumber: true,
				total: true,
				user: { select: { email: true } },
			},
		});

		if (!order) {
			logger.error(`❌ [WEBHOOK] Order not found for refund alert: ${orderId}`, undefined, {
				service: "webhook",
			});
			return;
		}

		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(orderId)}`;

		await sendAdminRefundFailedAlert({
			orderNumber: order.orderNumber,
			customerEmail: order.user?.email ?? "Email non disponible",
			amount: order.total,
			reason,
			errorMessage,
			stripePaymentIntentId: paymentIntentId,
			dashboardUrl,
		});

		logger.info(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${orderId}`, {
			service: "webhook",
		});
	} catch (alertError) {
		logger.error(
			`❌ [WEBHOOK] Failed to send refund failure alert for order ${orderId}:`,
			alertError,
			{ service: "webhook" },
		);
	}
}
