"use server";

import { RefundAction, RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { bulkRejectRefundsSchema } from "../schemas/refund.schemas";

/**
 * Rejette plusieurs remboursements en une seule action (passe de PENDING à REJECTED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING seront rejetés
 * - Les remboursements déjà traités seront ignorés
 * - Une raison optionnelle peut être fournie (appliquée à tous)
 */
export async function bulkRejectRefunds(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.BULK_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const idsRaw = formData.get("ids") as string;
		const reason = formData.get("reason") as string | null;
		let ids: string[];

		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide",
			};
		}

		const validated = validateInput(bulkRejectRefundsSchema, { ids, reason });
		if ("error" in validated) return validated.error;

		// Récupérer les remboursements éligibles (PENDING uniquement, non supprimés)
		const refunds = await prisma.refund.findMany({
			where: {
				id: { in: result.data.ids },
				status: RefundStatus.PENDING,
				deletedAt: null,
			},
			select: {
				id: true,
				amount: true,
				note: true,
				order: {
					select: {
						orderNumber: true,
					},
				},
			},
		});

		if (refunds.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun remboursement éligible au rejet (seuls les remboursements en attente peuvent être rejetés)",
			};
		}

		// Sanitiser la raison avant stockage
		const sanitizedReason = result.data.reason ? sanitizeText(result.data.reason) : null;

		// Rejeter tous les remboursements avec audit trail
		await prisma.$transaction(async (tx) => {
			for (const refund of refunds) {
				const updatedNote = sanitizedReason
					? refund.note
						? `${refund.note}\n\n[REFUSÉ] ${sanitizedReason}`
						: `[REFUSÉ] ${sanitizedReason}`
					: refund.note;

				await tx.refund.update({
					where: { id: refund.id },
					data: {
						status: RefundStatus.REJECTED,
						note: updatedNote,
					},
				});

				await tx.refundHistory.create({
					data: {
						refundId: refund.id,
						action: RefundAction.REJECTED,
						note: sanitizedReason || undefined,
						authorId: adminUser.id,
					},
				});
			}
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		const totalAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
		const skipped = result.data.ids.length - refunds.length;

		let message = `${refunds.length} remboursement${refunds.length > 1 ? "s" : ""} refusé${refunds.length > 1 ? "s" : ""} (${(totalAmount / 100).toFixed(2)} €)`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà traité${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		return handleActionError(error, REFUND_ERROR_MESSAGES.REJECT_FAILED);
	}
}
