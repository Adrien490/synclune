"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { rejectRefundSchema } from "../schemas/refund.schemas";

/**
 * Rejette un remboursement (passe de PENDING à REJECTED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING peuvent être rejetés
 * - Une raison optionnelle peut être fournie
 */
export async function rejectRefund(
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
		const reason = formData.get("reason") as string | null;

		const validated = validateInput(rejectRefundSchema, { id, reason });
		if ("error" in validated) return validated.error;

		// Récupérer le remboursement
		const refund = await prisma.refund.findUnique({
			where: { id, deletedAt: null },
			select: {
				id: true,
				status: true,
				amount: true,
				note: true,
				order: {
					select: {
						orderNumber: true,
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

		// Vérifier le statut actuel
		if (refund.status === RefundStatus.REJECTED) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_REJECTED,
			};
		}

		if (refund.status !== RefundStatus.PENDING) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_PROCESSED,
			};
		}

		// Sanitiser et construire la note avec la raison du rejet
		const sanitizedReason = validated.data.reason ? sanitizeText(validated.data.reason) : null;
		const updatedNote = sanitizedReason
			? refund.note
				? `${refund.note}\n\n[REFUSÉ] ${sanitizedReason}`
				: `[REFUSÉ] ${sanitizedReason}`
			: refund.note;

		// Mettre à jour le statut
		// Le where inclut le statut attendu pour protection TOCTOU
		await prisma.refund.update({
			where: { id, status: RefundStatus.PENDING },
			data: {
				status: RefundStatus.REJECTED,
				note: updatedNote,
			},
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refund.amount / 100).toFixed(2)} € refusé pour la commande ${refund.order.orderNumber}`,
		};
	} catch (error) {
		return handleActionError(error, REFUND_ERROR_MESSAGES.REJECT_FAILED);
	}
}
