"use server";

import { OrderStatus, PaymentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { sendCancelOrderConfirmationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { cancelOrderSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { canCancelOrder } from "../services/order-status-validation.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { sanitizeText } from "@/shared/lib/sanitize";

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
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const id = formData.get("id") as string;
		const reason = formData.get("reason") as string | null;
		const sanitizedReason = reason ? sanitizeText(reason) : null;

		const result = cancelOrderSchema.safeParse({ id, reason: sanitizedReason });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		// Transaction: fetch + validate + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, deletedAt: null },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					total: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
						},
					},
				},
			});

			if (!found) return null;

			// Validate via state machine service (blocks SHIPPED, DELIVERED, CANCELLED)
			if (!canCancelOrder(found)) {
				const _error = found.status === OrderStatus.CANCELLED ? "already_cancelled" as const : "cannot_cancel" as const;
				return { ...found, _error };
			}

			// Déterminer le nouveau paymentStatus
			const newPaymentStatus =
				found.paymentStatus === PaymentStatus.PAID
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

			// 3. Audit trail (Best Practice Stripe 2025)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "CANCELLED",
				previousStatus: found.status,
				newStatus: OrderStatus.CANCELLED,
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: newPaymentStatus,
				note: sanitizedReason || undefined,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					stockRestored: shouldRestoreStock,
					itemsCount: found.items.length,
				},
			});

			return { ...found, _newPaymentStatus: newPaymentStatus, _shouldRestoreStock: shouldRestoreStock };
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

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));

		// Envoyer l'email de confirmation d'annulation au client
		let emailSent = false;
		if (order.customerEmail) {
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));

			try {
				await sendCancelOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					orderTotal: order.total,
					reason: sanitizedReason || undefined,
					wasRefunded: order._newPaymentStatus === PaymentStatus.REFUNDED,
					orderDetailsUrl,
				});
				emailSent = true;
			} catch (emailError) {
				console.error("[CANCEL_ORDER] Échec envoi email:", emailError);
			}
		}

		const refundMessage =
			order._newPaymentStatus === PaymentStatus.REFUNDED
				? " Le statut de paiement a été passé à REFUNDED."
				: "";

		const stockMessage = order._shouldRestoreStock && order.items.length > 0
			? ` Stock restauré pour ${order.items.length} article(s).`
			: order.items.length > 0 && !order._shouldRestoreStock
				? " Stock non restauré (commande déjà payée/traitée)."
				: "";

		const emailMessage = emailSent ? " Email envoyé au client." : order.customerEmail ? " (Échec envoi email)" : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} annulée.${refundMessage}${stockMessage}${emailMessage}`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.CANCEL_FAILED);
	}
}
