"use server";

import { OrderStatus, HistorySource } from "@/app/generated/prisma/client";
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
import { undoReturnSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { canUndoReturn } from "../services/order-status-validation.service";

/**
 * Annule un retour saisi par erreur (RETURNED → DELIVERED)
 * Réservé aux administrateurs
 *
 * `RETURNED` était un état ABSORBANT (différé de l'audit « Livraison et
 * tracking » 2026-07-26, fermé le 2026-08-01) : aucune transition sortante —
 * un retour saisi par erreur était irréversible par l'UI et verrouillait
 * définitivement l'édition d'adresse (`update-order-shipping-address` refuse
 * une commande RETURNED).
 *
 * Règles métier :
 * - La commande doit être (DELIVERED, RETURNED) — l'état exact que
 *   `markAsReturned` produit ;
 * - Transition explicite `RETURNED → DELIVERED` sur `status` (axe unique depuis le Lot 4) ;
 * - Audit `STATUS_REVERTED` (pas de nouvelle valeur d'enum : `OrderAction` est
 *   un type Postgres sur un historique baseliné) + `note` explicite ;
 * - Ne touche PAS aux Refunds : un remboursement déjà créé suit son propre
 *   cycle de vie (le retour redevient marquable une fois le refund clos).
 */
export async function undoReturn(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(undoReturnSchema, {
			id: safeFormGet(formData, "id"),
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
				},
			});

			if (!found) return null;

			const validation = canUndoReturn(found);
			if (!validation.canUndo) {
				return { ...found, _error: validation.reason };
			}

			// Garde atomique : ré-asserte RETURNED — miroir de canUndoReturn.
			// count===0 ⇒ writer concurrent entre le findUnique et l'update — abort
			// sans audit. Un seul axe depuis le Lot 4 : la sortie du retour est une
			// transition explicite `RETURNED → DELIVERED`.
			const updated = await tx.order.updateMany({
				where: {
					id,
					...notDeleted,
					status: OrderStatus.RETURNED,
				},
				data: {
					status: OrderStatus.DELIVERED,
				},
			});
			if (updated.count === 0) {
				return { ...found, _error: "concurrent_change" as const };
			}

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "STATUS_REVERTED",
				previousStatus: OrderStatus.RETURNED,
				newStatus: OrderStatus.DELIVERED,
				note: "Retour annulé (saisie par erreur)",
				authorName: adminUser.name ?? "Admin",
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
			return {
				status: ActionStatus.ERROR,
				message:
					order._error === "concurrent_change"
						? ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE
						: ORDER_ERROR_MESSAGES.CANNOT_UNDO_NOT_RETURNED,
			};
		}

		getOrderInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Retour annulé — la commande ${order.orderNumber} est de nouveau marquée comme livrée.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UNDO_RETURN_FAILED);
	}
}
