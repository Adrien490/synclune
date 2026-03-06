"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, error, safeFormGetJSON } from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { sendRefundApprovedEmail } from "@/modules/emails/services/refund-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { logAudit } from "@/shared/lib/audit-log";
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
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.BULK_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const ids = safeFormGetJSON<string[]>(formData, "ids");
		if (!ids) return error("Format des IDs invalide");

		const validated = validateInput(bulkApproveRefundsSchema, { ids });
		if ("error" in validated) return validated.error;

		// Récupérer les remboursements éligibles (PENDING uniquement, non supprimés)
		const refunds = await prisma.refund.findMany({
			where: {
				id: { in: validated.data.ids },
				status: RefundStatus.PENDING,
				...notDeleted,
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
								id: true,
								email: true,
								name: true,
							},
						},
					},
				},
			},
		});

		if (refunds.length === 0) {
			return error(
				"Aucun remboursement éligible à l'approbation (seuls les remboursements en attente peuvent être approuvés)",
			);
		}

		// Approuver tous les remboursements (updateMany pour compter les changements réels
		// et éviter qu'une mise à jour concurrente ne bloque toute la transaction)
		const updateResult = await prisma.refund.updateMany({
			where: {
				id: { in: refunds.map((r) => r.id) },
				status: RefundStatus.PENDING,
				...notDeleted,
			},
			data: { status: RefundStatus.APPROVED },
		});
		const actualCount = updateResult.count;

		// Invalidate admin caches
		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(DASHBOARD_CACHE_TAGS.KPIS);
		updateTag(DASHBOARD_CACHE_TAGS.REVENUE_CHART);
		updateTag(DASHBOARD_CACHE_TAGS.RECENT_ORDERS);
		const uniqueOrderIds = [...new Set(refunds.map((r) => r.order.id))];
		uniqueOrderIds.forEach((orderId) => updateTag(ORDERS_CACHE_TAGS.REFUNDS(orderId)));

		// Invalidate per-user caches
		const uniqueUserIds = [
			...new Set(refunds.map((r) => r.order.user?.id).filter(Boolean)),
		] as string[];
		for (const userId of uniqueUserIds) {
			updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(userId));
		}

		// Send approval emails to customers (non-blocking)
		for (const refund of refunds) {
			if (refund.order.user?.email) {
				const isPartialRefund = refund.amount < refund.order.total;
				const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refund.order.id));

				sendRefundApprovedEmail({
					to: refund.order.user.email,
					orderNumber: refund.order.orderNumber,
					customerName: refund.order.user.name ?? "Client",
					refundAmount: refund.amount,
					originalOrderTotal: refund.order.total,
					reason: refund.reason,
					isPartialRefund,
					orderDetailsUrl,
				}).catch((emailError) => {
					prisma.orderNote
						.create({
							data: {
								orderId: refund.order.id,
								content: `[EMAIL] Échec notification approbation groupée (commande ${refund.order.orderNumber}) : ${emailError instanceof Error ? emailError.message : String(emailError)}`,
								authorId: "system",
								authorName: "Système (bulk-approve-refunds)",
							},
						})
						.catch(() => {});
				});
			}
		}

		const totalAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
		const skipped = validated.data.ids.length - actualCount;

		let message = `${actualCount} remboursement${actualCount > 1 ? "s" : ""} approuvé${actualCount > 1 ? "s" : ""} (${(totalAmount / 100).toFixed(2)} €)`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà traité${skipped > 1 ? "s" : ""})`;
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "refund.bulkApprove",
			targetType: "refund",
			targetId: refunds.map((r) => r.id).join(","),
			metadata: {
				count: actualCount,
				totalAmount: totalAmount,
			},
		});

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		return handleActionError(error, REFUND_ERROR_MESSAGES.APPROVE_FAILED);
	}
}
