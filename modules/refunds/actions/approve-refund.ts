"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
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
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { logAudit } from "@/shared/lib/audit-log";
import { approveRefundSchema } from "../schemas/refund.schemas";
import { canTransition } from "../services/refund-state-machine.service";

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

		// Mettre à jour le statut
		// Le where inclut le statut attendu pour protection TOCTOU
		await prisma.refund.update({
			where: { id, status: RefundStatus.PENDING },
			data: {
				status: RefundStatus.APPROVED,
			},
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(REFUNDS_CACHE_TAGS.LIST);
		updateTag(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(refund.order.id));
		if (refund.order.user?.id) {
			updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(refund.order.user.id));
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "refund.approve",
			targetType: "refund",
			targetId: refund.id,
			metadata: {
				orderNumber: refund.order.orderNumber,
				amount: refund.amount,
			},
		});

		return success(
			`Remboursement de ${(refund.amount / 100).toFixed(2)} € approuvé pour la commande ${refund.order.orderNumber}`,
		);
	} catch (e) {
		return handleActionError(e, REFUND_ERROR_MESSAGES.APPROVE_FAILED);
	}
}
