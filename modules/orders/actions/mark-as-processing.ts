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
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsProcessingSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { canMarkAsProcessing } from "../services/order-status-validation.service";

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
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(markAsProcessingSchema, { id: rawId });
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
					fulfillmentStatus: true,
					userId: true,
				},
			});

			if (!found) return null;

			const validation = canMarkAsProcessing(found);
			if (!validation.canProcess) {
				return { ...found, _error: validation.reason };
			}

			// Garde atomique : ré-asserte PENDING + payé (miroir de canMarkAsProcessing).
			// count===0 ⇒ writer concurrent entre le findUnique et l'update — abort
			// sans audit (le findUnique ne verrouille pas la ligne en read-committed).
			const updated = await tx.order.updateMany({
				where: {
					id,
					...notDeleted,
					status: OrderStatus.PENDING,
					paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
				},
				data: {
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
				},
			});
			if (updated.count === 0) {
				return { ...found, _error: "concurrent_change" as const };
			}

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "PROCESSING",
				previousStatus: found.status,
				newStatus: OrderStatus.PROCESSING,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
			});

			return found;
		});

		if (!order) {
			return notFound("Commande");
		}

		if ("_error" in order) {
			const errorMessages = {
				already_processing: ORDER_ERROR_MESSAGES.ALREADY_PROCESSING,
				not_pending: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_NOT_PENDING,
				cancelled: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_CANCELLED,
				unpaid: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_UNPAID,
				concurrent_change: ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE,
			} as const;
			return error(errorMessages[order._error]);
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return success(`Commande ${order.orderNumber} passée en préparation.`);
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_PROCESSING_FAILED);
	}
}
