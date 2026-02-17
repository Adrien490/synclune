"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
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

		// Récupérer la commande
		const order = await prisma.order.findUnique({
			where: { id, deletedAt: null },
			select: {
				id: true,
				orderNumber: true,
				status: true,
				paymentStatus: true,
				fulfillmentStatus: true,
				userId: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier si déjà en préparation ou plus avancée
		if (order.status === OrderStatus.PROCESSING) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.ALREADY_PROCESSING,
			};
		}

		if (
			order.status === OrderStatus.SHIPPED ||
			order.status === OrderStatus.DELIVERED
		) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_NOT_PENDING,
			};
		}

		// Vérifier si annulée
		if (order.status === OrderStatus.CANCELLED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_CANCELLED,
			};
		}

		// Vérifier si payée
		if (order.paymentStatus !== PaymentStatus.PAID) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_UNPAID,
			};
		}

		// Mettre à jour la commande + audit trail atomique
		await prisma.$transaction(async (tx) => {
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
				previousStatus: order.status,
				newStatus: OrderStatus.PROCESSING,
				previousFulfillmentStatus: order.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				source: HistorySource.ADMIN,
			});
		});

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
