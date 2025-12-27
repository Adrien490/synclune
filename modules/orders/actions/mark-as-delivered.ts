"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { sendDeliveryConfirmationEmail } from "@/modules/emails/services/order-emails";
import { scheduleReviewRequestEmail } from "@/modules/webhooks/services/review-request.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsDeliveredSchema } from "../schemas/order.schemas";
import { createOrderAudit } from "../utils/order-audit";

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
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		// Récupérer les infos de l'admin pour l'audit trail
		const session = await getSession();
		const adminId = session?.user?.id;
		const adminName = session?.user?.name || "Admin";

		const id = formData.get("id") as string;
		const sendEmail = formData.get("sendEmail") as string | null;

		const result = markAsDeliveredSchema.safeParse({
			id,
			sendEmail: sendEmail || "true",
		});
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		const order = await prisma.order.findUnique({
			where: { id },
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

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier si déjà livrée
		if (order.status === OrderStatus.DELIVERED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.ALREADY_DELIVERED,
			};
		}

		// Vérifier si expédiée
		if (order.status !== OrderStatus.SHIPPED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_DELIVER_NOT_SHIPPED,
			};
		}

		const deliveryDate = new Date();

		// Mettre à jour la commande
		await prisma.order.update({
			where: { id },
			data: {
				status: OrderStatus.DELIVERED,
				fulfillmentStatus: FulfillmentStatus.DELIVERED,
				actualDelivery: deliveryDate,
			},
		});

		// 🔴 AUDIT TRAIL (Best Practice Stripe 2025)
		await createOrderAudit({
			orderId: id,
			action: "DELIVERED",
			previousStatus: order.status,
			newStatus: OrderStatus.DELIVERED,
			previousFulfillmentStatus: order.fulfillmentStatus,
			newFulfillmentStatus: FulfillmentStatus.DELIVERED,
			authorId: adminId,
			authorName: adminName,
			source: "admin",
			metadata: {
				deliveryDate: deliveryDate.toISOString(),
				emailSent: result.data.sendEmail,
			},
		});

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));
		revalidatePath("/admin/ventes/commandes");
		revalidatePath(`/compte/commandes/${order.orderNumber}`);

		// Envoyer l'email de confirmation de livraison au client
		if (result.data.sendEmail && order.customerEmail) {
			// Extraire le prénom du customerName ou utiliser shippingFirstName
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			// Formater la date de livraison
			const deliveryDateStr = deliveryDate.toLocaleDateString("fr-FR", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			// URL vers la page de détail de la commande
			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
			const orderDetailsUrl = `${baseUrl}/compte/commandes/${order.orderNumber}`;

			await sendDeliveryConfirmationEmail({
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				deliveryDate: deliveryDateStr,
				orderDetailsUrl,
			});
		}

		// Planifier l'envoi de l'email de demande d'avis
		// (ne bloque pas le flux principal en cas d'erreur)
		await scheduleReviewRequestEmail(id);

		const emailSent = result.data.sendEmail ? " Email envoyé au client." : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme livrée.${emailSent}`,
		};
	} catch (error) {
		console.error("[MARK_AS_DELIVERED]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.MARK_AS_DELIVERED_FAILED,
		};
	}
}
