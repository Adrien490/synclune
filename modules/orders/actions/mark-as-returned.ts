"use server";

import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsReturnedSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { canMarkAsReturned } from "../services/order-status-validation.service";

/**
 * Marque une commande livrée comme retournée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être DELIVERED
 * - Le OrderStatus reste DELIVERED (on ne revient pas en arrière)
 * - Passe FulfillmentStatus à RETURNED
 * - Optionnel : raison du retour pour l'audit trail
 *
 * ORD-BIZ-010 : cette action NE déclenche PAS de restock automatique. Le
 * restock est lié au `Refund` (RefundItem.restock=true) — l'admin doit
 * créer manuellement le remboursement après le retour, ce qui restockera
 * en même temps qu'il rembourse. Le dialog `MarkAsReturnedAlertDialog`
 * propose un lien direct vers la création de remboursement en étape 2.
 * `metadata.requiresRefund: true` est tracé pour faciliter les futurs
 * filtres "retours en attente de remboursement".
 */
export async function markAsReturned(
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
		const reason = rawReason ? sanitizeText(rawReason) : null;

		const validated = validateInput(markAsReturnedSchema, {
			id: rawId,
			reason: reason ?? undefined,
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
					fulfillmentStatus: true,
					userId: true,
					total: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
				},
			});

			if (!found) return null;

			const validation = canMarkAsReturned(found);
			if (!validation.canReturn) {
				return { ...found, _error: validation.reason };
			}

			// Garde atomique : ré-asserte DELIVERED + pas déjà RETURNED (miroir de
			// canMarkAsReturned). count===0 ⇒ writer concurrent entre le findUnique
			// et l'update — abort sans audit (le findUnique ne verrouille pas la
			// ligne en read-committed).
			const updated = await tx.order.updateMany({
				where: {
					id,
					...notDeleted,
					status: OrderStatus.DELIVERED,
					fulfillmentStatus: { not: FulfillmentStatus.RETURNED },
				},
				data: {
					fulfillmentStatus: FulfillmentStatus.RETURNED,
				},
			});
			if (updated.count === 0) {
				return { ...found, _error: "concurrent_change" as const };
			}

			// ORD-BIZ-010 : `requiresRefund: true` flag pour identifier les retours
			// en attente de remboursement (cron / dashboard alert futur).
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "RETURNED",
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.RETURNED,
				note: validated.data.reason,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: { requiresRefund: true, restockAutomated: false },
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
				order._error === "already_returned"
					? ORDER_ERROR_MESSAGES.ALREADY_RETURNED
					: order._error === "concurrent_change"
						? ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE
						: ORDER_ERROR_MESSAGES.CANNOT_RETURN_NOT_DELIVERED;
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme retournée. Vous pouvez créer un remboursement si nécessaire.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_RETURNED_FAILED);
	}
}
