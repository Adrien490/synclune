"use server";

import {
	OrderStatus,
	FulfillmentStatus,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { sendReturnConfirmationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
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
		const reason = formData.get("reason") as string | null;

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

		// Récupérer la commande
		const order = await prisma.order.findUnique({
			where: { id, deletedAt: null },
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

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier si déjà retournée
		if (order.fulfillmentStatus === FulfillmentStatus.RETURNED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.ALREADY_RETURNED,
			};
		}

		// Vérifier que la commande est bien livrée
		if (order.status !== OrderStatus.DELIVERED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_RETURN_NOT_DELIVERED,
			};
		}

		// Mettre à jour la commande + audit trail atomique
		await prisma.$transaction(async (tx) => {
			await tx.order.update({
				where: { id },
				data: {
					fulfillmentStatus: FulfillmentStatus.RETURNED,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "RETURNED",
				previousFulfillmentStatus: order.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.RETURNED,
				note: result.data.reason,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				source: HistorySource.ADMIN,
			});
		});

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
