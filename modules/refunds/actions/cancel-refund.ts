"use server";

import { HistorySource, OrderAction, RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS, REFUNDS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { cancelRefundSchema } from "../schemas/refund.schemas";
import { canTransition } from "../services/refund-state-machine.service";

/**
 * Annule un remboursement (supprime si PENDING ou APPROVED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING ou APPROVED peuvent être annulés
 * - Les remboursements COMPLETED, REJECTED ou FAILED ne peuvent pas être annulés
 */
export async function cancelRefund(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.SINGLE_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(cancelRefundSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Récupérer le remboursement
		const refund = await prisma.refund.findUnique({
			where: { id, ...notDeleted },
			select: {
				id: true,
				status: true,
				amount: true,
				order: {
					select: {
						id: true,
						orderNumber: true,
						user: {
							select: {
								id: true,
								email: true,
								name: true,
							},
						},
					},
				},
			},
		});

		if (!refund) {
			return error(REFUND_ERROR_MESSAGES.NOT_FOUND);
		}

		// Vérifier le statut actuel - cancel transition autorisée seulement depuis
		// PENDING ou APPROVED (state machine partagée)
		if (!canTransition(refund.status, RefundStatus.CANCELLED)) {
			return error(REFUND_ERROR_MESSAGES.CANNOT_CANCEL);
		}

		// Soft delete : marquer comme CANCELLED au lieu de supprimer
		// (Conformité comptable Art. L123-22 Code de Commerce - conservation 10 ans)
		// Le where inclut le statut courant pour protection TOCTOU
		await prisma.$transaction(async (tx) => {
			const updated = await tx.refund.updateMany({
				where: { id, status: refund.status },
				data: {
					status: RefundStatus.CANCELLED,
					deletedAt: new Date(),
				},
			});
			if (updated.count === 0) {
				throw new Error("ALREADY_PROCESSED");
			}
			// ORD-REFUND-001: audit trail (REFUND_FAILED + event=cancelled_by_admin
			// car pas d'enum REFUND_CANCELLED dédié)
			await createOrderAuditTx(tx, {
				orderId: refund.order.id,
				action: OrderAction.REFUND_FAILED,
				source: HistorySource.ADMIN,
				authorId: adminUser.id,
				authorName: adminUser.name ?? adminUser.email,
				note: "Remboursement annulé (soft delete)",
				metadata: {
					refundId: refund.id,
					amount: refund.amount,
					event: "cancelled_by_admin",
					previousStatus: refund.status,
					newStatus: RefundStatus.CANCELLED,
				},
			});
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(REFUNDS_CACHE_TAGS.LIST);
		updateTag(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(refund.order.id));
		if (refund.order.user?.id) {
			updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(refund.order.user.id));
		}

		return success(
			`Remboursement de ${(refund.amount / 100).toFixed(2)} € annulé pour la commande ${refund.order.orderNumber}`,
		);
	} catch (e) {
		if (e instanceof Error && e.message === "ALREADY_PROCESSED") {
			return error(REFUND_ERROR_MESSAGES.ALREADY_PROCESSED);
		}
		return handleActionError(e, REFUND_ERROR_MESSAGES.CANCEL_FAILED);
	}
}
