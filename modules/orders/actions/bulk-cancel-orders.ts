"use server";

import { OrderStatus, PaymentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { bulkCancelOrdersSchema } from "../schemas/order.schemas";
import { getOrderInvalidationTags } from "../constants/cache";
import { getOrdersForBulkCancel } from "../data/get-orders-for-bulk-cancel";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Annule plusieurs commandes en masse
 * Réservé aux administrateurs
 *
 * Filtrage automatique :
 * - Seules les commandes non annulées seront traitées
 * - La logique de restauration de stock est appliquée pour chaque commande PENDING
 */
export async function bulkCancelOrders(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];
		const reason = formData.get("reason") as string | null;

		const validated = validateInput(bulkCancelOrdersSchema, {
			ids,
			reason: reason || undefined,
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Filtrer les commandes éligibles (via data/)
		const eligibleOrders = await getOrdersForBulkCancel(validatedData.ids);

		if (eligibleOrders.length === 0) {
			return error("Aucune commande eligible pour l'annulation.");
		}

		let stockRestored = 0;
		let refundedCount = 0;

		// Pré-calculer les mises à jour de stock pour éviter N+1 queries
		// Grouper les quantités par skuId pour batch update
		const stockUpdates = new Map<string, number>();
		const orderUpdates: Array<{
			id: string;
			newPaymentStatus: PaymentStatus;
			shouldRestoreStock: boolean;
		}> = [];

		for (const order of eligibleOrders) {
			const newPaymentStatus =
				order.paymentStatus === PaymentStatus.PAID
					? PaymentStatus.REFUNDED
					: order.paymentStatus;

			if (newPaymentStatus === PaymentStatus.REFUNDED) {
				refundedCount++;
			}

			const shouldRestoreStock = order.paymentStatus === PaymentStatus.PENDING;
			orderUpdates.push({ id: order.id, newPaymentStatus, shouldRestoreStock });

			// Collecter les quantités à restaurer par SKU
			if (shouldRestoreStock && order.items.length > 0) {
				for (const item of order.items) {
					const current = stockUpdates.get(item.skuId) || 0;
					stockUpdates.set(item.skuId, current + item.quantity);
				}
				stockRestored++;
			}
		}

		// Transaction pour annuler toutes les commandes
		await prisma.$transaction(async (tx) => {
			// Batch update de toutes les commandes en parallèle
			await Promise.all(
				orderUpdates.map((order) =>
					tx.order.update({
						where: { id: order.id },
						data: {
							status: OrderStatus.CANCELLED,
							paymentStatus: order.newPaymentStatus,
						},
					})
				)
			);

			// Batch update de tous les stocks en parallèle (1 requête par SKU unique)
			if (stockUpdates.size > 0) {
				await Promise.all(
					Array.from(stockUpdates.entries()).map(([skuId, quantity]) =>
						tx.productSku.update({
							where: { id: skuId },
							data: {
								inventory: { increment: quantity },
							},
						})
					)
				);
			}

			// Audit trail for each cancelled order
			await Promise.all(
				eligibleOrders.map((order) => {
					const update = orderUpdates.find((u) => u.id === order.id)!;
					return createOrderAuditTx(tx, {
						orderId: order.id,
						action: "CANCELLED",
						previousStatus: order.status,
						newStatus: OrderStatus.CANCELLED,
						previousPaymentStatus: order.paymentStatus,
						newPaymentStatus: update.newPaymentStatus,
						note: validatedData.reason,
						authorId: adminUser.id,
						authorName: adminUser.name || "Admin",
						source: HistorySource.ADMIN,
						metadata: {
							bulk: true,
							stockRestored: update.shouldRestoreStock,
						},
					});
				})
			);
		});

		// Invalider les caches pour chaque userId unique
		const uniqueUserIds = [...new Set(eligibleOrders.map(o => o.userId).filter(Boolean))] as string[];
		uniqueUserIds.forEach(userId => {
			getOrderInvalidationTags(userId).forEach(tag => updateTag(tag));
		});
		// Toujours invalider la liste admin (même si pas d'userId)
		getOrderInvalidationTags().forEach(tag => updateTag(tag));

		const messages = [`${eligibleOrders.length} commande${eligibleOrders.length > 1 ? "s" : ""} annulee${eligibleOrders.length > 1 ? "s" : ""}.`];

		if (refundedCount > 0) {
			messages.push(`${refundedCount} passee${refundedCount > 1 ? "s" : ""} a REFUNDED.`);
		}

		if (stockRestored > 0) {
			messages.push(`Stock restaure pour ${stockRestored} commande${stockRestored > 1 ? "s" : ""}.`);
		}

		return success(messages.join(" "));
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'annulation des commandes.");
	}
}
