"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { cancelRefundSchema } from "../schemas/refund.schemas";

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
	formData: FormData
): Promise<ActionState> {
	try {
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.SINGLE_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const id = formData.get("id") as string;

		const validated = validateInput(cancelRefundSchema, { id });
		if ("error" in validated) return validated.error;

		// Récupérer le remboursement
		const refund = await prisma.refund.findUnique({
			where: { id, deletedAt: null },
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
							},
						},
					},
				},
			},
		});

		if (!refund) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: REFUND_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier le statut actuel - on ne peut annuler que PENDING ou APPROVED
		if (
			refund.status !== RefundStatus.PENDING &&
			refund.status !== RefundStatus.APPROVED
		) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.CANNOT_CANCEL,
			};
		}

		// Soft delete : marquer comme CANCELLED au lieu de supprimer
		// (Conformité comptable Art. L123-22 Code de Commerce - conservation 10 ans)
		// Le where inclut le statut courant pour protection TOCTOU
		await prisma.refund.update({
			where: { id, status: refund.status },
			data: {
				status: RefundStatus.CANCELLED,
				deletedAt: new Date(),
			},
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(refund.order.id));
		if (refund.order.user?.id) {
			updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(refund.order.user.id));
		}

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refund.amount / 100).toFixed(2)} € annulé pour la commande ${refund.order.orderNumber}`,
		};
	} catch (error) {
		return handleActionError(error, REFUND_ERROR_MESSAGES.CANCEL_FAILED);
	}
}
