"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, logOrderStatusChange } from "@/shared/lib/prisma";
import { getSession } from "@/shared/utils/get-session";
import { sendRevertShippingNotificationEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { revertToProcessingSchema } from "../schemas/order.schemas";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		// Récupérer l'ID de l'admin pour l'audit trail
		const session = await getSession();
		const adminUserId = session?.user?.id;

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

		// Récupérer la commande
		const order = await prisma.order.findUnique({
			where: { id },
			select: {
				id: true,
				orderNumber: true,
				status: true,
				fulfillmentStatus: true,
				trackingNumber: true,
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

		// Vérifier que la commande est bien expédiée
		if (order.status !== OrderStatus.SHIPPED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_REVERT_NOT_SHIPPED,
			};
		}

		// Mettre à jour la commande
		await prisma.order.update({
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

		// Enregistrer l'historique des changements de statut (audit trail)
		await logOrderStatusChange({
			orderId: id,
			field: "status",
			previousStatus: order.status,
			newStatus: OrderStatus.PROCESSING,
			changedBy: adminUserId,
			reason: `Expédition annulée - ${result.data.reason}`,
		});

		await logOrderStatusChange({
			orderId: id,
			field: "fulfillmentStatus",
			previousStatus: order.fulfillmentStatus,
			newStatus: FulfillmentStatus.PROCESSING,
			changedBy: adminUserId,
			reason: result.data.reason,
		});

		revalidatePath("/admin/ventes/commandes");

		// Envoyer l'email de notification au client
		if (order.customerEmail) {
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
			const orderDetailsUrl = `${baseUrl}/compte/commandes/${order.orderNumber}`;

			await sendRevertShippingNotificationEmail({
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				reason: result.data.reason,
				orderDetailsUrl,
			});
		}

		const trackingInfo = order.trackingNumber
			? ` (ancien suivi: ${order.trackingNumber})`
			: "";

		const emailMessage = order.customerEmail ? " Email envoyé au client." : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Expédition de la commande ${order.orderNumber} annulée.${trackingInfo}${emailMessage} La commande est de nouveau en préparation.`,
		};
	} catch (error) {
		console.error("[REVERT_TO_PROCESSING]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.REVERT_TO_PROCESSING_FAILED,
		};
	}
}
