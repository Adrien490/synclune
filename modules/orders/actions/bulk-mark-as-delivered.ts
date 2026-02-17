"use server";

import {
	OrderStatus,
	FulfillmentStatus,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { scheduleReviewRequestEmailsBulk } from "@/modules/webhooks/services/review-request.service";
import { sendDeliveryConfirmationEmail } from "@/modules/emails/services/order-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { updateTag } from "next/cache";

import { bulkMarkAsDeliveredSchema } from "../schemas/order.schemas";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";

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
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];
		const sendEmail = formData.get("sendEmail") as string | null;

		const validated = validateInput(bulkMarkAsDeliveredSchema, {
			ids,
			sendEmail: sendEmail || "false",
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Filtrer les commandes éligibles (SHIPPED uniquement)
		const eligibleOrders = await prisma.order.findMany({
			where: {
				id: { in: validatedData.ids },
				status: OrderStatus.SHIPPED,
				deletedAt: null,
			},
			select: { id: true, orderNumber: true, userId: true, customerEmail: true, customerName: true, shippingFirstName: true },
		});

		if (eligibleOrders.length === 0) {
			return error("Aucune commande eligible (doivent etre au statut SHIPPED).");
		}

		const eligibleIds = eligibleOrders.map((o) => o.id);
		const deliveryDate = new Date();

		// Mettre à jour toutes les commandes + audit trail atomique
		await prisma.$transaction(async (tx) => {
			await tx.order.updateMany({
				where: { id: { in: eligibleIds } },
				data: {
					status: OrderStatus.DELIVERED,
					fulfillmentStatus: FulfillmentStatus.DELIVERED,
					actualDelivery: deliveryDate,
				},
			});

			await Promise.all(
				eligibleOrders.map((order) =>
					createOrderAuditTx(tx, {
						orderId: order.id,
						action: "DELIVERED",
						previousStatus: OrderStatus.SHIPPED,
						newStatus: OrderStatus.DELIVERED,
						previousFulfillmentStatus: FulfillmentStatus.SHIPPED,
						newFulfillmentStatus: FulfillmentStatus.DELIVERED,
						authorId: adminUser.id,
						authorName: adminUser.name || "Admin",
						source: HistorySource.ADMIN,
						metadata: {
							bulk: true,
							deliveryDate: deliveryDate.toISOString(),
						},
					})
				)
			);
		});

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
						customerName: order.shippingFirstName || order.customerName || "Client",
						deliveryDate: formattedDeliveryDate,
						orderDetailsUrl,
					}).catch(() => {});
				}
			}
		}

		// Planifier l'envoi des emails de demande d'avis
		// (ne bloque pas le flux principal en cas d'erreur)
		await scheduleReviewRequestEmailsBulk(eligibleIds);

		// Invalider les caches pour chaque userId unique
		const uniqueUserIds = [...new Set(eligibleOrders.map(o => o.userId).filter(Boolean))] as string[];
		uniqueUserIds.forEach(userId => {
			getOrderInvalidationTags(userId).forEach(tag => updateTag(tag));
		});
		// Toujours invalider la liste admin (même si pas d'userId)
		getOrderInvalidationTags().forEach(tag => updateTag(tag));

		const count = eligibleOrders.length;
		return success(`${count} commande${count > 1 ? "s" : ""} marquee${count > 1 ? "s" : ""} comme livree${count > 1 ? "s" : ""}.`);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise a jour des commandes.");
	}
}
