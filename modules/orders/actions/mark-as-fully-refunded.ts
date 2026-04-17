"use server";

import { PaymentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { logAudit } from "@/shared/lib/audit-log";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsFullyRefundedSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Marque une commande comme entièrement remboursée
 * Réservé aux administrateurs
 *
 * Cas d'usage : remboursement effectué hors de Stripe (geste commercial,
 * remboursement bancaire manuel, avoir). Ne déclenche AUCUN refund Stripe :
 * pour rembourser via Stripe, utiliser modules/refunds/actions/create-refund.
 *
 * Règles métier :
 * - paymentStatus doit être PAID ou PARTIALLY_REFUNDED
 * - Statut commande inchangé (utiliser cancelOrder pour annuler)
 * - Audit trail avec raison optionnelle
 */
export async function markAsFullyRefunded(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawReason = safeFormGet(formData, "reason");
		const reason = rawReason ? sanitizeText(rawReason) : null;

		const validated = validateInput(markAsFullyRefundedSchema, {
			id: safeFormGet(formData, "id"),
			reason: reason ?? undefined,
		});
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					userId: true,
					paymentStatus: true,
				},
			});

			if (!found) return null;

			if (found.paymentStatus === PaymentStatus.REFUNDED) {
				return { ...found, _error: "already_refunded" as const };
			}

			if (
				found.paymentStatus !== PaymentStatus.PAID &&
				found.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
			) {
				return { ...found, _error: "not_paid" as const };
			}

			await tx.order.update({
				where: { id },
				data: { paymentStatus: PaymentStatus.REFUNDED },
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "REFUND_COMPLETED",
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: PaymentStatus.REFUNDED,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				note: reason ?? "Marquée comme remboursée (manuel)",
				metadata: {
					manual: true,
					previousPaymentStatus: found.paymentStatus,
				},
			});

			return found;
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			const message =
				order._error === "already_refunded"
					? ORDER_ERROR_MESSAGES.ALREADY_FULLY_REFUNDED
					: ORDER_ERROR_MESSAGES.CANNOT_REFUND_NOT_PAID;
			return { status: ActionStatus.ERROR, message };
		}

		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.markFullyRefunded",
			targetType: "order",
			targetId: order.id,
			metadata: {
				orderNumber: order.orderNumber,
				previousPaymentStatus: order.paymentStatus,
				reason: reason ?? null,
			},
		});

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme remboursée. Aucun appel Stripe effectué.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_FULLY_REFUNDED_FAILED);
	}
}
