"use server";

import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { scheduleReviewRequestEmailsBulk } from "@/modules/reviews/services/review-request.service";
import { sendDeliveryConfirmationEmail } from "@/modules/emails/services/order-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";

import { logAudit } from "@/shared/lib/audit-log";
import { bulkMarkAsDeliveredSchema } from "../schemas/order.schemas";
import { getOrderInvalidationTags, ORDERS_CACHE_TAGS } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";

/**
 * Marque plusieurs commandes comme livrées
 * Réservé aux administrateurs
 *
 * Filtrage automatique :
 * - Seules les commandes avec status = SHIPPED seront traitées
 * - Les commandes déjà livrées ou non expédiées sont ignorées
 */
export async function bulkMarkAsDelivered(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsString = formData.get("ids");
		let ids: unknown = [];
		try {
			ids = idsString ? JSON.parse(String(idsString)) : [];
		} catch {
			return error("Format d'IDs invalide");
		}
		const sendEmail = safeFormGet(formData, "sendEmail");

		const validated = validateInput(bulkMarkAsDeliveredSchema, {
			ids,
			sendEmail: sendEmail ?? "false",
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		const deliveryDate = new Date();

		// Filtrer les commandes éligibles + mettre à jour + audit trail atomique
		const eligibleOrders = await prisma.$transaction(async (tx) => {
			const eligible = await tx.order.findMany({
				where: {
					id: { in: validatedData.ids },
					status: OrderStatus.SHIPPED,
					...notDeleted,
				},
				select: {
					id: true,
					orderNumber: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
				},
			});

			if (eligible.length === 0) return [];

			const eligibleIds = eligible.map((o) => o.id);

			await tx.order.updateMany({
				where: { id: { in: eligibleIds } },
				data: {
					status: OrderStatus.DELIVERED,
					fulfillmentStatus: FulfillmentStatus.DELIVERED,
					actualDelivery: deliveryDate,
				},
			});

			await Promise.all(
				eligible.map((order) =>
					createOrderAuditTx(tx, {
						orderId: order.id,
						action: "DELIVERED",
						previousStatus: OrderStatus.SHIPPED,
						newStatus: OrderStatus.DELIVERED,
						previousFulfillmentStatus: FulfillmentStatus.SHIPPED,
						newFulfillmentStatus: FulfillmentStatus.DELIVERED,
						authorId: adminUser.id,
						authorName: adminUser.name ?? "Admin",
						source: HistorySource.ADMIN,
						metadata: {
							bulk: true,
							deliveryDate: deliveryDate.toISOString(),
						},
					}),
				),
			);

			return eligible;
		});

		if (eligibleOrders.length === 0) {
			return error("Aucune commande éligible (doivent être au statut SHIPPED).");
		}

		const eligibleIds = eligibleOrders.map((o) => o.id);

		// Send delivery confirmation emails if requested
		if (validatedData.sendEmail) {
			const formattedDeliveryDate = deliveryDate.toLocaleDateString("fr-FR", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});
			for (const order of eligibleOrders) {
				if (order.customerEmail) {
					const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));
					sendDeliveryConfirmationEmail({
						to: order.customerEmail,
						orderNumber: order.orderNumber,
						customerName: extractCustomerFirstName(order.customerName, order.shippingFirstName),
						deliveryDate: formattedDeliveryDate,
						orderDetailsUrl,
					}).catch((emailError) => {
						logger.error(`Échec envoi email pour ${order.orderNumber}`, emailError, {
							action: "bulk-mark-as-delivered",
						});
					});
				}
			}
		}

		// Planifier l'envoi des emails de demande d'avis
		// (ne bloque pas le flux principal en cas d'erreur)
		await scheduleReviewRequestEmailsBulk(eligibleIds);

		// Invalider les caches pour chaque userId unique
		const uniqueUserIds = [
			...new Set(eligibleOrders.map((o) => o.userId).filter(Boolean)),
		] as string[];
		uniqueUserIds.forEach((userId) => {
			getOrderInvalidationTags(userId).forEach((tag) => updateTag(tag));
		});
		// Toujours invalider la liste admin (même si pas d'userId)
		getOrderInvalidationTags().forEach((tag) => updateTag(tag));
		// Invalider l'historique de chaque commande
		eligibleOrders.forEach((o) => updateTag(ORDERS_CACHE_TAGS.HISTORY(o.id)));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.bulkMarkDelivered",
			targetType: "order",
			targetId: eligibleIds.join(","),
			metadata: {
				count: eligibleOrders.length,
				orderNumbers: eligibleOrders.map((o) => o.orderNumber),
			},
		});

		const count = eligibleOrders.length;
		return success(
			`${count} commande${count > 1 ? "s" : ""} marquée${count > 1 ? "s" : ""} comme livrée${count > 1 ? "s" : ""}.`,
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour des commandes.");
	}
}
