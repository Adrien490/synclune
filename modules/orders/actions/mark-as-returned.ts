"use server";

import {
	OrderStatus,
	FulfillmentStatus,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendReturnConfirmationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsReturnedSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

/**
 * Marque une commande livrée comme retournée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être DELIVERED
 * - Le OrderStatus reste DELIVERED (on ne revient pas en arrière)
 * - Passe FulfillmentStatus à RETURNED
 * - Optionnel : raison du retour pour l'audit trail
 */
export async function markAsReturned(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const id = formData.get("id") as string;
		const rawReason = formData.get("reason") as string | null;
		const reason = rawReason ? sanitizeText(rawReason) : null;

		const result = markAsReturnedSchema.safeParse({
			id,
			reason: reason || undefined,
		});

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Transaction: fetch + validate + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					fulfillmentStatus: true,
					userId: true,
					total: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
				},
			});

			if (!found) return null;

			if (found.fulfillmentStatus === FulfillmentStatus.RETURNED) {
				return { ...found, _error: "already_returned" as const };
			}

			if (found.status !== OrderStatus.DELIVERED) {
				return { ...found, _error: "not_delivered" as const };
			}

			await tx.order.update({
				where: { id },
				data: {
					fulfillmentStatus: FulfillmentStatus.RETURNED,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "RETURNED",
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.RETURNED,
				note: result.data.reason,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				source: HistorySource.ADMIN,
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
			const message = order._error === "already_returned"
				? ORDER_ERROR_MESSAGES.ALREADY_RETURNED
				: ORDER_ERROR_MESSAGES.CANNOT_RETURN_NOT_DELIVERED;
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));

		// Envoyer l'email de confirmation de retour au client
		let emailSent = false;
		if (order.customerEmail) {
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));

			try {
				await sendReturnConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					orderTotal: order.total,
					reason: result.data.reason,
					orderDetailsUrl,
				});
				emailSent = true;
			} catch (emailError) {
				console.error("[MARK_AS_RETURNED] Échec envoi email:", emailError);
			}
		}

		const emailMessage = emailSent ? " Email envoyé au client." : order.customerEmail ? " (Échec envoi email)" : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme retournée.${emailMessage} Vous pouvez créer un remboursement si nécessaire.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_RETURNED_FAILED);
	}
}
