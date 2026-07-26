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
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS, REFUNDS_CACHE_TAGS } from "../constants/cache";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { rejectRefundSchema } from "../schemas/refund.schemas";
import { canTransition } from "../services/refund-state-machine.service";

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
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.SINGLE_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const reason = formData.get("reason") as string | null;

		const validated = validateInput(rejectRefundSchema, { id: rawId, reason });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Récupérer le remboursement
		const refund = await prisma.refund.findUnique({
			where: { id, ...notDeleted },
			select: {
				id: true,
				status: true,
				amount: true,
				note: true,
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

		// Vérifier le statut actuel
		if (refund.status === RefundStatus.REJECTED) {
			return error(REFUND_ERROR_MESSAGES.ALREADY_REJECTED);
		}

		if (!canTransition(refund.status, RefundStatus.REJECTED)) {
			return error(REFUND_ERROR_MESSAGES.ALREADY_PROCESSED);
		}

		// Sanitiser et construire la note avec la raison du rejet
		const sanitizedReason = validated.data.reason ? sanitizeText(validated.data.reason) : null;
		const updatedNote = sanitizedReason
			? refund.note
				? `${refund.note}\n\n[REFUSÉ] ${sanitizedReason}`
				: `[REFUSÉ] ${sanitizedReason}`
			: refund.note;

		// Mettre à jour le statut + audit dans une transaction atomique
		await prisma.$transaction(async (tx) => {
			const updated = await tx.refund.updateMany({
				where: { id, status: RefundStatus.PENDING },
				data: { status: RefundStatus.REJECTED, note: updatedNote },
			});
			if (updated.count === 0) {
				throw new Error("ALREADY_PROCESSED");
			}
			// ORD-REFUND-001: audit trail (action=REFUND_FAILED + event=rejected_by_admin
			// car l'enum OrderAction n'a pas de REFUND_REJECTED dédié)
			await createOrderAuditTx(tx, {
				orderId: refund.order.id,
				action: OrderAction.REFUND_FAILED,
				source: HistorySource.ADMIN,
				authorId: adminUser.id,
				authorName: adminUser.name ?? adminUser.email,
				note: sanitizedReason ?? "Remboursement refusé",
				metadata: {
					refundId: refund.id,
					amount: refund.amount,
					event: "rejected_by_admin",
					rejectionReason: sanitizedReason,
					previousStatus: RefundStatus.PENDING,
					newStatus: RefundStatus.REJECTED,
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
			`Remboursement de ${(refund.amount / 100).toFixed(2)} € refusé pour la commande ${refund.order.orderNumber}`,
		);
	} catch (e) {
		if (e instanceof Error && e.message === "ALREADY_PROCESSED") {
			return error(REFUND_ERROR_MESSAGES.ALREADY_PROCESSED);
		}
		return handleActionError(e, REFUND_ERROR_MESSAGES.REJECT_FAILED);
	}
}
