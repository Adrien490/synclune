"use server";

import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";
import { markAsDeliveredSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { canMarkAsDelivered } from "../services/order-status-validation.service";

/**
 * Marque une commande comme livrée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être expédiée (OrderStatus.SHIPPED)
 * - Utilisé pour forcer le statut si le webhook transporteur ne fonctionne pas
 * - Passe OrderStatus à DELIVERED
 * - Passe FulfillmentStatus à DELIVERED
 * - Enregistre la date de livraison effective
 */
export async function markAsDelivered(
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

		const validated = validateInput(markAsDeliveredSchema, {
			id: rawId,
		});
		if ("error" in validated) return validated.error;

		const { id } = validated.data;
		const deliveryDate = new Date();

		// Transaction: fetch + validate + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					fulfillmentStatus: true,
					userId: true,
				},
			});

			if (!found) return null;

			const validation = canMarkAsDelivered(found);
			if (!validation.canDeliver) {
				return { ...found, _error: validation.reason };
			}

			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.DELIVERED,
					fulfillmentStatus: FulfillmentStatus.DELIVERED,
					actualDelivery: deliveryDate,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "DELIVERED",
				previousStatus: found.status,
				newStatus: OrderStatus.DELIVERED,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.DELIVERED,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					deliveryDate: deliveryDate.toISOString(),
				},
			});

			return found;
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			const message =
				order._error === "already_delivered"
					? ORDER_ERROR_MESSAGES.ALREADY_DELIVERED
					: ORDER_ERROR_MESSAGES.CANNOT_DELIVER_NOT_SHIPPED;
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Invalider les caches (orders list admin + commandes user + reviewable products)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));
		if (order.userId) {
			updateTag(REVIEWS_CACHE_TAGS.REVIEWABLE(order.userId));
		}

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme livrée.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_DELIVERED_FAILED);
	}
}
