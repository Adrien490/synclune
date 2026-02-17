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

import { sendRefundApprovedEmail } from "@/modules/emails/services/refund-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { bulkApproveRefundsSchema } from "../schemas/refund.schemas";

/**
 * Approuve plusieurs remboursements en une seule action (passe de PENDING à APPROVED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING seront approuvés
 * - Les remboursements déjà traités seront ignorés
 */
export async function bulkApproveRefunds(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.BULK_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;

		const idsRaw = formData.get("ids") as string;
		let ids: string[];

		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide",
			};
		}

		const validated = validateInput(bulkApproveRefundsSchema, { ids });
		if ("error" in validated) return validated.error;

		// Récupérer les remboursements éligibles (PENDING uniquement, non supprimés)
		const refunds = await prisma.refund.findMany({
			where: {
				id: { in: validated.data.ids },
				status: RefundStatus.PENDING,
				deletedAt: null,
			},
			select: {
				id: true,
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

		if (refunds.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun remboursement éligible à l'approbation (seuls les remboursements en attente peuvent être approuvés)",
			};
		}

		// Approuver tous les remboursements avec audit trail
		await prisma.$transaction(async (tx) => {
			for (const refund of refunds) {
				await tx.refund.update({
					where: { id: refund.id, status: RefundStatus.PENDING },
					data: { status: RefundStatus.APPROVED },
				});

			}
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		const uniqueOrderIds = [...new Set(refunds.map(r => r.order.id))];
		uniqueOrderIds.forEach(orderId => updateTag(ORDERS_CACHE_TAGS.REFUNDS(orderId)));

		// Send approval emails to customers (non-blocking)
		for (const refund of refunds) {
			if (refund.order.user?.email) {
				const isPartialRefund = refund.amount < refund.order.total;
				const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refund.order.id));

				sendRefundApprovedEmail({
					to: refund.order.user.email,
					orderNumber: refund.order.orderNumber,
					customerName: refund.order.user.name || "Client",
					refundAmount: refund.amount,
					originalOrderTotal: refund.order.total,
					reason: refund.reason,
					isPartialRefund,
					orderDetailsUrl,
				}).catch((emailError) => {
					console.error(`[BULK_APPROVE_REFUNDS] Échec envoi email pour ${refund.order.orderNumber}:`, emailError);
				});
			}
		}

		const totalAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
		const skipped = validated.data.ids.length - refunds.length;

		let message = `${refunds.length} remboursement${refunds.length > 1 ? "s" : ""} approuvé${refunds.length > 1 ? "s" : ""} (${(totalAmount / 100).toFixed(2)} €)`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà traité${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		return handleActionError(error, REFUND_ERROR_MESSAGES.APPROVE_FAILED);
	}
}
