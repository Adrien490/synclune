"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
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
import { retryFailedRefundSchema } from "../schemas/refund.schemas";
import { canTransition } from "../services/refund-state-machine.service";

/**
 * Relance un remboursement en échec (passe de FAILED à APPROVED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en FAILED peuvent être relancés
 * - Reset le failureReason et conserve le stripeRefundId (anchor idempotence)
 * - L'admin doit ensuite déclencher processRefund pour rappeler Stripe
 */
export async function retryFailedRefund(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.PROCESS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(retryFailedRefundSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		const refund = await prisma.refund.findUnique({
			where: { id, ...notDeleted },
			select: {
				id: true,
				status: true,
				amount: true,
				failureReason: true,
				stripeRefundId: true,
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
			return error(REFUND_ERROR_MESSAGES.NOT_FOUND);
		}

		if (refund.status !== RefundStatus.FAILED) {
			return error(REFUND_ERROR_MESSAGES.NOT_FAILED);
		}

		if (!canTransition(refund.status, RefundStatus.APPROVED)) {
			return error(REFUND_ERROR_MESSAGES.NOT_FAILED);
		}

		// Transition FAILED → APPROVED avec protection TOCTOU.
		// P0.2: incrémente `attemptCount` pour que processRefund génère une
		// nouvelle clé d'idempotence Stripe (sinon Stripe rejoue la réponse
		// d'erreur cachée pendant 24h).
		// On efface aussi `stripeRefundId` : la précédente tentative n'a pas
		// créé de refund Stripe valide (status = FAILED), donc l'anchor doit
		// être réinitialisé pour permettre une vraie nouvelle attempt.
		await prisma.refund.update({
			where: { id, status: RefundStatus.FAILED },
			data: {
				status: RefundStatus.APPROVED,
				failureReason: null,
				stripeRefundId: null,
				attemptCount: { increment: 1 },
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

		return success(
			`Remboursement de ${(refund.amount / 100).toFixed(2)} € réarmé pour la commande ${refund.order.orderNumber}. Cliquez sur "Traiter" pour relancer Stripe.`,
		);
	} catch (e) {
		return handleActionError(e, REFUND_ERROR_MESSAGES.RETRY_FAILED);
	}
}
