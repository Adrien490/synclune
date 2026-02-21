"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsProcessingSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Passe une commande payée en cours de préparation
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être en PENDING
 * - La commande doit être payée (PaymentStatus.PAID)
 * - La commande ne doit pas être annulée
 * - Passe OrderStatus à PROCESSING
 * - Passe FulfillmentStatus à PROCESSING
 */
export async function markAsProcessing(
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

		const result = markAsProcessingSchema.safeParse({ id });

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Transaction: fetch + validate + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					fulfillmentStatus: true,
					userId: true,
				},
			});

			if (!found) return null;

			if (found.status === OrderStatus.PROCESSING) {
				return { ...found, _error: "already_processing" as const };
			}

			if (found.status === OrderStatus.SHIPPED || found.status === OrderStatus.DELIVERED) {
				return { ...found, _error: "not_pending" as const };
			}

			if (found.status === OrderStatus.CANCELLED) {
				return { ...found, _error: "cancelled" as const };
			}

			if (found.paymentStatus !== PaymentStatus.PAID) {
				return { ...found, _error: "unpaid" as const };
			}

			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "PROCESSING",
				previousStatus: found.status,
				newStatus: OrderStatus.PROCESSING,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				source: HistorySource.ADMIN,
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
			const errorMessages = {
				already_processing: ORDER_ERROR_MESSAGES.ALREADY_PROCESSING,
				not_pending: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_NOT_PENDING,
				cancelled: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_CANCELLED,
				unpaid: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_UNPAID,
			} as const;
			return {
				status: ActionStatus.ERROR,
				message: errorMessages[order._error],
			};
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} passée en préparation.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_PROCESSING_FAILED);
	}
}
