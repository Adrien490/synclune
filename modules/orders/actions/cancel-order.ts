"use server";

import {
	OrderStatus,
	PaymentStatus,
	HistorySource,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendCancelOrderConfirmationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { cancelOrderSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { canCancelOrder } from "../services/order-status-validation.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { sanitizeText } from "@/shared/lib/sanitize";
import { extractCustomerFirstName } from "../utils/customer-name";

/**
 * Annule une commande
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Passe le statut de la commande à CANCELLED
 * - Si la commande était payée, passe le paymentStatus à REFUNDED
 * - Remet le stock (inventory) des SKUs à jour (incrémentation)
 * - Préserve l'intégrité comptable (la commande reste en base avec son invoiceNumber)
 * - Une commande déjà annulée ne peut pas être annulée à nouveau
 */
export async function cancelOrder(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const rawReason = safeFormGet(formData, "reason");
		const sanitizedReason = rawReason ? sanitizeText(rawReason) : null;
		const autoRefund = safeFormGet(formData, "autoRefund") === "true";

		const validated = validateInput(cancelOrderSchema, {
			id: rawId,
			reason: sanitizedReason,
			autoRefund,
		});
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Transaction: fetch + validate + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					total: true,
					stripePaymentIntentId: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
					items: {
						select: {
							id: true,
							skuId: true,
							quantity: true,
							price: true,
						},
					},
				},
			});

			if (!found) return null;

			// Validate via state machine service (blocks SHIPPED, DELIVERED, CANCELLED)
			if (!canCancelOrder(found)) {
				const _error =
					found.status === OrderStatus.CANCELLED
						? ("already_cancelled" as const)
						: ("cannot_cancel" as const);
				return { ...found, _error };
			}

			// Déterminer le nouveau paymentStatus
			const newPaymentStatus =
				found.paymentStatus === PaymentStatus.PAID ||
				found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
					? PaymentStatus.REFUNDED
					: found.paymentStatus;

			// Ne restaurer le stock QUE si la commande était PENDING
			const shouldRestoreStock = found.paymentStatus === PaymentStatus.PENDING;

			// 1. Mettre à jour la commande
			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.CANCELLED,
					paymentStatus: newPaymentStatus,
				},
			});

			// 2. Restaurer le stock uniquement si la commande était PENDING
			if (shouldRestoreStock) {
				for (const item of found.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: {
							inventory: {
								increment: item.quantity,
							},
						},
					});
				}
			}

			// 3. Libérer les codes promo utilisés sur cette commande
			const discountUsages = await tx.discountUsage.findMany({
				where: { orderId: id },
				select: { id: true, discountId: true },
			});

			const releasedDiscountIds: string[] = [];
			for (const usage of discountUsages) {
				await tx.discount.update({
					where: { id: usage.discountId },
					data: { usageCount: { decrement: 1 } },
				});
				releasedDiscountIds.push(usage.discountId);
			}

			if (discountUsages.length > 0) {
				await tx.discountUsage.deleteMany({ where: { orderId: id } });
			}

			// 4. Auto-refund: créer un Refund (status APPROVED) qui sera traité par
			// le cron reconcile-refunds (appel Stripe asynchrone hors transaction)
			let createdRefundId: string | null = null;
			const wasPaid = found.paymentStatus === PaymentStatus.PAID;
			if (autoRefund && wasPaid) {
				const refund = await tx.refund.create({
					data: {
						orderId: id,
						amount: found.total,
						reason: RefundReason.CUSTOMER_REQUEST,
						status: RefundStatus.APPROVED,
						note: sanitizedReason ?? "Remboursement automatique sur annulation",
						createdBy: adminUser.id,
						items: {
							create: found.items.map((item) => ({
								orderItemId: item.id,
								quantity: item.quantity,
								amount: item.price * item.quantity,
								restock: shouldRestoreStock,
							})),
						},
					},
					select: { id: true },
				});
				createdRefundId = refund.id;
			}

			// 5. Audit trail (Best Practice Stripe 2025)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "CANCELLED",
				previousStatus: found.status,
				newStatus: OrderStatus.CANCELLED,
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: newPaymentStatus,
				note: sanitizedReason ?? undefined,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					stockRestored: shouldRestoreStock,
					itemsCount: found.items.length,
					releasedDiscountIds,
					autoRefundId: createdRefundId,
				},
			});

			return {
				...found,
				_newPaymentStatus: newPaymentStatus,
				_shouldRestoreStock: shouldRestoreStock,
				_autoRefundId: createdRefundId,
			};
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			const message =
				order._error === "already_cancelled"
					? ORDER_ERROR_MESSAGES.ALREADY_CANCELLED
					: "Impossible d'annuler une commande expediee ou livree.";
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.cancel",
			targetType: "order",
			targetId: id,
			metadata: {
				orderNumber: order.orderNumber,
				previousStatus: order.status,
				reason: sanitizedReason,
				stockRestored: order._shouldRestoreStock,
			},
		});

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		// Si auto-refund, invalider également le cache des remboursements de la commande
		if (order._autoRefundId) {
			updateTag(`order-refunds-${order.id}`);
		}

		// Fire-and-forget email to avoid blocking the admin response
		if (order.customerEmail) {
			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);

			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));

			void sendCancelOrderConfirmationEmail({
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				orderTotal: order.total,
				reason: sanitizedReason ?? undefined,
				wasRefunded: order._newPaymentStatus === PaymentStatus.REFUNDED,
				orderDetailsUrl,
			}).catch((emailError) => {
				logger.error("Échec envoi email", emailError, { action: "cancel-order" });
			});
		}

		const refundMessage = order._autoRefundId
			? ` Remboursement Stripe planifié (${(order.total / 100).toFixed(2)} €), sera traité par le cron reconcile-refunds.`
			: order._newPaymentStatus === PaymentStatus.REFUNDED
				? " Statut passé à REFUNDED. Un remboursement Stripe doit être effectué séparément si nécessaire."
				: "";

		const stockMessage =
			order._shouldRestoreStock && order.items.length > 0
				? ` Stock restauré pour ${order.items.length} article(s).`
				: order.items.length > 0 && !order._shouldRestoreStock
					? " Stock non restauré (commande déjà payée/traitée)."
					: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} annulée.${refundMessage}${stockMessage}`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.CANCEL_FAILED);
	}
}
