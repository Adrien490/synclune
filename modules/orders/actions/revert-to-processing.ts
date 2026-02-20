"use server";

import {
	OrderStatus,
	FulfillmentStatus,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { sendRevertShippingNotificationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { revertToProcessingSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

/**
 * Annule l'expédition et remet la commande en préparation
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être en SHIPPED
 * - Efface les informations de tracking (trackingNumber, trackingUrl, shippedAt)
 * - Passe OrderStatus à PROCESSING
 * - Passe FulfillmentStatus à PROCESSING
 * - Requiert une raison obligatoire pour l'audit trail
 */
export async function revertToProcessing(
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
		const reason = formData.get("reason") as string;

		const result = revertToProcessingSchema.safeParse({
			id,
			reason,
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
				where: { id, deletedAt: null },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					fulfillmentStatus: true,
					userId: true,
					trackingNumber: true,
					trackingUrl: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
				},
			});

			if (!found) return null;

			if (found.status !== OrderStatus.SHIPPED) {
				return { ...found, _error: "not_shipped" as const };
			}

			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
					trackingNumber: null,
					trackingUrl: null,
					shippingCarrier: null,
					shippedAt: null,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "STATUS_REVERTED",
				previousStatus: found.status,
				newStatus: OrderStatus.PROCESSING,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				note: result.data.reason,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					previousTrackingNumber: found.trackingNumber,
					previousTrackingUrl: found.trackingUrl,
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
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_REVERT_NOT_SHIPPED,
			};
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));

		// Envoyer l'email de notification au client
		let emailSent = false;
		if (order.customerEmail) {
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));

			try {
				await sendRevertShippingNotificationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					reason: result.data.reason,
					orderDetailsUrl,
				});
				emailSent = true;
			} catch (emailError) {
				console.error("[REVERT_TO_PROCESSING] Échec envoi email:", emailError);
			}
		}

		const trackingInfo = order.trackingNumber
			? ` (ancien suivi: ${order.trackingNumber})`
			: "";

		const emailMessage = emailSent ? " Email envoyé au client." : order.customerEmail ? " (Échec envoi email)" : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Expédition de la commande ${order.orderNumber} annulée.${trackingInfo}${emailMessage} La commande est de nouveau en préparation.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.REVERT_TO_PROCESSING_FAILED);
	}
}
