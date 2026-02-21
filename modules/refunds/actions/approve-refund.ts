"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { updateTag } from "next/cache";

import { sendRefundApprovedEmail } from "@/modules/emails/services/refund-emails";
import { logFailedEmail } from "@/modules/emails/services/log-failed-email";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { approveRefundSchema } from "../schemas/refund.schemas";

/**
 * Approuve un remboursement (passe de PENDING à APPROVED)
 * Réservé aux administrateurs
 */
export async function approveRefund(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;

		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.SINGLE_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const id = formData.get("id") as string;

		const validated = validateInput(approveRefundSchema, { id });
		if ("error" in validated) return validated.error;

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

		if (refund.status !== RefundStatus.PENDING) {
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
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(refund.order.id));
		updateTag(DASHBOARD_CACHE_TAGS.KPIS);
		updateTag(DASHBOARD_CACHE_TAGS.REVENUE_CHART);
		updateTag(DASHBOARD_CACHE_TAGS.RECENT_ORDERS);
		if (refund.order.user?.id) {
			updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(refund.order.user.id));
		}

		// Envoyer l'email de notification au client (non bloquant)
		if (refund.order.user?.email) {
			const isPartialRefund = refund.amount < refund.order.total;
			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refund.order.id));

			try {
				await sendRefundApprovedEmail({
					to: refund.order.user.email,
					orderNumber: refund.order.orderNumber,
					customerName: refund.order.user.name || "Client",
					refundAmount: refund.amount,
					originalOrderTotal: refund.order.total,
					reason: refund.reason,
					isPartialRefund,
					orderDetailsUrl,
				});
			} catch (emailError) {
				console.error("[APPROVE_REFUND] Échec envoi email:", emailError);
				await logFailedEmail({
					to: refund.order.user!.email,
					subject: `Remboursement approuvé — Commande ${refund.order.orderNumber}`,
					template: "refund-approved",
					payload: {
						orderNumber: refund.order.orderNumber,
						customerName: refund.order.user!.name || "Client",
						refundAmount: refund.amount,
						originalOrderTotal: refund.order.total,
						reason: refund.reason,
						isPartialRefund,
						orderDetailsUrl,
					},
					error: emailError,
					orderId: refund.order.id,
				});
			}
		}

		return success(`Remboursement de ${(refund.amount / 100).toFixed(2)} € approuvé pour la commande ${refund.order.orderNumber}`);
	} catch (e) {
		return handleActionError(e, REFUND_ERROR_MESSAGES.APPROVE_FAILED);
	}
}
