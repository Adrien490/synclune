"use server";

import { HistorySource, OrderAction, RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
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
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { approveRefundSchema } from "../schemas/refund.schemas";
import { canTransition } from "../services/refund-state-machine.service";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";

/**
 * Approuve un remboursement (passe de PENDING à APPROVED)
 * Réservé aux administrateurs
 */
export async function approveRefund(
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

		const validated = validateInput(approveRefundSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Récupérer le remboursement avec les infos pour l'email
		const refund = await prisma.refund.findUnique({
			where: { id, ...notDeleted },
			select: {
				id: true,
				status: true,
				amount: true,
				reason: true,
				order: {
					select: {
						id: true,
						orderNumber: true,
						total: true,
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

		// Vérifier le statut actuel
		if (refund.status === RefundStatus.APPROVED) {
			return error(REFUND_ERROR_MESSAGES.ALREADY_APPROVED);
		}

		if (!canTransition(refund.status, RefundStatus.APPROVED)) {
			return error(REFUND_ERROR_MESSAGES.ALREADY_PROCESSED);
		}

		// Mettre à jour le statut + audit trail dans une transaction atomique
		// Le where inclut le statut attendu pour protection TOCTOU
		await prisma.$transaction(async (tx) => {
			const updated = await tx.refund.updateMany({
				where: { id, status: RefundStatus.PENDING },
				data: { status: RefundStatus.APPROVED },
			});
			if (updated.count === 0) {
				// Concurrent state change between findUnique and update.
				throw new Error("ALREADY_PROCESSED");
			}
			// ORD-REFUND-001: audit trail conformité L123-22
			await createOrderAuditTx(tx, {
				orderId: refund.order.id,
				action: OrderAction.REFUND_CREATED,
				source: HistorySource.ADMIN,
				authorId: adminUser.id,
				authorName: adminUser.name ?? adminUser.email,
				note: "Remboursement approuvé",
				metadata: {
					refundId: refund.id,
					amount: refund.amount,
					reason: refund.reason,
					event: "approved",
					previousStatus: RefundStatus.PENDING,
					newStatus: RefundStatus.APPROVED,
				},
			});
		});

		// CACHE-AUDIT-010 : passer par le helper SSOT. La liste manuelle omettait
		// DETAIL(orderId) / HISTORY(orderId) alors que cette action écrit une entrée
		// d'OrderHistory affichée sur la page détail de la commande, et ne couvrait
		// qu'USER_ORDERS parmi les tags user-scopés.
		for (const tag of getOrderInvalidationTags(refund.order.user?.id, refund.order.id)) {
			updateTag(tag);
		}
		updateTag(REFUNDS_CACHE_TAGS.LIST);
		updateTag(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(refund.order.id));

		return success(
			`Remboursement de ${(refund.amount / 100).toFixed(2)} € approuvé pour la commande ${refund.order.orderNumber}`,
		);
	} catch (e) {
		if (e instanceof Error && e.message === "ALREADY_PROCESSED") {
			return error(REFUND_ERROR_MESSAGES.ALREADY_PROCESSED);
		}
		return handleActionError(e, REFUND_ERROR_MESSAGES.APPROVE_FAILED);
	}
}
