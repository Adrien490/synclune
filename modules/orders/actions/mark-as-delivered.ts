"use server";

import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendDeliveryConfirmationEmail } from "@/modules/emails/services/order-emails";
import { scheduleReviewRequestEmail } from "@/modules/webhooks/services/review-request.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, safeFormGet } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { logAudit } from "@/shared/lib/audit-log";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";
import { markAsDeliveredSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";
import { canMarkAsDelivered } from "../services/order-status-validation.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

/**
 * Marque une commande comme livrée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être expédiée (OrderStatus.SHIPPED)
 * - Utilisé pour forcer le statut si le webhook transporteur ne fonctionne pas
 * - Passe OrderStatus à DELIVERED
 * - Passe FulfillmentStatus à DELIVERED
 * - Enregistre la date de livraison effective
 * - Envoie un email au client si sendEmail = true
 */
export async function markAsDelivered(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const sendEmail = safeFormGet(formData, "sendEmail");

		const result = markAsDeliveredSchema.safeParse({
			id: rawId,
			sendEmail: sendEmail ?? "true",
		});
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message ?? "ID invalide",
			};
		}

		const { id } = result.data;
		const deliveryDate = new Date();

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
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
				},
			});

			if (!found) return null;

			const validation = canMarkAsDelivered(found);
			if (!validation.canDeliver) {
				return { ...found, _error: validation.reason };
			}

			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.DELIVERED,
					fulfillmentStatus: FulfillmentStatus.DELIVERED,
					actualDelivery: deliveryDate,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "DELIVERED",
				previousStatus: found.status,
				newStatus: OrderStatus.DELIVERED,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.DELIVERED,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					deliveryDate: deliveryDate.toISOString(),
					emailSent: result.data.sendEmail,
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
				order._error === "already_delivered"
					? ORDER_ERROR_MESSAGES.ALREADY_DELIVERED
					: ORDER_ERROR_MESSAGES.CANNOT_DELIVER_NOT_SHIPPED;
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Invalider les caches (orders list admin + commandes user + reviewable products)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));
		if (order.userId) {
			updateTag(REVIEWS_CACHE_TAGS.REVIEWABLE(order.userId));
		}

		// Envoyer l'email de confirmation de livraison au client
		let emailSent = false;
		if (result.data.sendEmail && order.customerEmail) {
			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);

			// Formater la date de livraison
			const deliveryDateStr = deliveryDate.toLocaleDateString("fr-FR", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			// URL vers la page de détail de la commande
			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));

			try {
				await sendDeliveryConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					deliveryDate: deliveryDateStr,
					orderDetailsUrl,
				});
				emailSent = true;
			} catch (emailError) {
				console.error("[MARK_AS_DELIVERED] Échec envoi email livraison:", emailError);
			}
		}

		// Planifier l'envoi de l'email de demande d'avis
		// (ne bloque pas le flux principal en cas d'erreur)
		try {
			await scheduleReviewRequestEmail(id);
		} catch (reviewEmailError) {
			console.error("[MARK_AS_DELIVERED] Échec planification email avis:", reviewEmailError);
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.markDelivered",
			targetType: "order",
			targetId: order.id,
			metadata: {
				orderNumber: order.orderNumber,
				previousStatus: order.status,
			},
		});

		const emailMessage = emailSent
			? " Email envoyé au client."
			: result.data.sendEmail
				? " (Échec envoi email)"
				: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme livrée.${emailMessage}`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_DELIVERED_FAILED);
	}
}
