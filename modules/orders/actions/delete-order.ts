"use server";

import { HistorySource, OrderAction, PaymentStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { deleteOrderSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Supprime une commande
 * Réservé aux administrateurs
 *
 * Règles métier (conformité comptable) :
 * - Une commande peut être supprimée UNIQUEMENT si :
 *   1. Aucune facture n'a été émise (invoiceNumber === null)
 *   2. Elle n'a jamais été payée (paymentStatus !== PAID et !== REFUNDED)
 *
 * - Une commande NE PEUT PAS être supprimée si :
 *   1. Une facture a été émise (invoiceNumber !== null)
 *      → La numérotation des factures doit être séquentielle sans "trou"
 *   2. Elle a été payée (même si remboursée ensuite)
 *      → Pour préserver la traçabilité comptable
 *
 * Dans ces cas, utilisez cancelOrder() à la place.
 */
export async function deleteOrder(
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
		const sanitizedReason = rawReason ? sanitizeText(rawReason) : undefined;

		const validated = validateInput(deleteOrderSchema, { id: rawId, reason: sanitizedReason });
		if ("error" in validated) return validated.error;

		const { id, reason } = validated.data;

		// Transaction: fetch + validate + soft delete + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					userId: true,
					status: true,
					paymentStatus: true,
					invoiceNumber: true,
				},
			});

			if (!found) return null;

			if (found.invoiceNumber) {
				return { ...found, _error: "has_invoice" as const };
			}

			if (
				found.paymentStatus === PaymentStatus.PAID ||
				found.paymentStatus === PaymentStatus.REFUNDED
			) {
				return { ...found, _error: "already_paid" as const };
			}

			// Soft delete (Art. L123-22 Code de Commerce - conservation 10 ans)
			await tx.order.update({
				where: { id },
				data: { deletedAt: new Date() },
			});

			// ORD-BIZ-003 : audit trail immuable de la suppression. Réutilise
			// OrderAction.CANCELLED (pas d'enum DELETED) avec metadata.deleted=true
			// pour préserver la séquentialité audit Art. L123-22.
			await createOrderAuditTx(tx, {
				orderId: id,
				action: OrderAction.CANCELLED,
				previousStatus: found.status,
				previousPaymentStatus: found.paymentStatus,
				note: reason,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					deleted: true,
					reason,
					previousStatus: found.status,
					previousPaymentStatus: found.paymentStatus,
				},
			});

			return found;
		});

		if (!order) {
			return error(ORDER_ERROR_MESSAGES.NOT_FOUND);
		}

		if ("_error" in order) {
			const message =
				order._error === "has_invoice"
					? ORDER_ERROR_MESSAGES.HAS_INVOICE
					: ORDER_ERROR_MESSAGES.CANNOT_DELETE_PAID;
			return error(message);
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		return success(`Commande ${order.orderNumber} supprimee.`);
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.DELETE_FAILED);
	}
}
