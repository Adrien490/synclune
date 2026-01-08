"use server";

import { RefundAction, RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

import { sendRefundApprovedEmail } from "@/modules/emails/services/refund-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
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
		const { user: adminUser } = auth;

		const id = formData.get("id") as string;

		const result = approveRefundSchema.safeParse({ id });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		// Récupérer le remboursement avec les infos pour l'email
		const refund = await prisma.refund.findUnique({
			where: { id },
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
								email: true,
								name: true,
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

		// Vérifier le statut actuel
		if (refund.status === RefundStatus.APPROVED) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_APPROVED,
			};
		}

		if (refund.status !== RefundStatus.PENDING) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_PROCESSED,
			};
		}

		// Mettre à jour le statut et créer l'entrée d'historique
		await prisma.$transaction(async (tx) => {
			await tx.refund.update({
				where: { id },
				data: {
					status: RefundStatus.APPROVED,
				},
			});

			await tx.refundHistory.create({
				data: {
					refundId: id,
					action: RefundAction.APPROVED,
					authorId: adminUser.id,
				},
			});
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		// Envoyer l'email de notification au client (non bloquant)
		if (refund.order.user?.email) {
			try {
				const isPartialRefund = refund.amount < refund.order.total;
				const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refund.order.id));

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
			}
		}

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refund.amount / 100).toFixed(2)} € approuvé pour la commande ${refund.order.orderNumber}`,
		};
	} catch (error) {
		console.error("[APPROVE_REFUND]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.APPROVE_FAILED,
		};
	}
}
