"use server";

import {
	PaymentStatus,
	HistorySource,
	RefundStatus,
	InvoiceStatus,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsFullyRefundedSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { voidInvoice } from "../services/void-invoice.service";

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
					invoiceStatus: true,
					invoiceNumber: true,
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

			// Bloquer si un Refund Stripe est en cours (PENDING ou APPROVED). Sinon
			// double remboursement possible : admin marque manuel ici + webhook
			// charge.refunded reconnaît le Refund APPROVED et le passe à COMPLETED.
			const pendingStripeRefunds = await tx.refund.count({
				where: {
					orderId: id,
					status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
					deletedAt: null,
				},
			});
			if (pendingStripeRefunds > 0) {
				return { ...found, _error: "pending_stripe_refunds" as const };
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
					: order._error === "pending_stripe_refunds"
						? ORDER_ERROR_MESSAGES.PENDING_STRIPE_REFUNDS
						: ORDER_ERROR_MESSAGES.CANNOT_REFUND_NOT_PAID;
			return { status: ActionStatus.ERROR, message };
		}

		// Émission avoir (Art. 272-I CGI) si la facture était active.
		// Hors transaction principale : advisory lock Postgres pas safe imbriqué.
		let creditNoteNumber: string | null = null;
		if (order.invoiceStatus === InvoiceStatus.GENERATED && order.invoiceNumber) {
			const voided = await voidInvoice({
				orderId: order.id,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				reason: reason ?? "Avoir suite à remboursement total manuel",
			});
			creditNoteNumber = voided?.creditNoteNumber ?? null;
		}

		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		const invoiceMessage = creditNoteNumber
			? ` Facture ${order.invoiceNumber} invalidée, avoir ${creditNoteNumber} émis.`
			: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme remboursée. Aucun appel Stripe effectué.${invoiceMessage}`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_FULLY_REFUNDED_FAILED);
	}
}
