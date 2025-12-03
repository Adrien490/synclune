"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { sendRevertShippingNotificationEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { revertToProcessingSchema } from "../schemas/order.schemas";
import { createOrderAudit } from "../utils/order-audit";

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

		// Récupérer les infos de l'admin pour l'audit trail
		const session = await getSession();
		const adminId = session?.user?.id;
		const adminName = session?.user?.name || "Admin";

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
				trackingUrl: true,
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

		// 🔴 AUDIT TRAIL (Best Practice Stripe 2025)
		await createOrderAudit({
			orderId: id,
			action: "STATUS_REVERTED",
			previousStatus: order.status,
			newStatus: OrderStatus.PROCESSING,
			previousFulfillmentStatus: order.fulfillmentStatus,
			newFulfillmentStatus: FulfillmentStatus.PROCESSING,
			note: result.data.reason,
			authorId: adminId,
			authorName: adminName,
			source: "admin",
			metadata: {
				previousTrackingNumber: order.trackingNumber,
				previousTrackingUrl: order.trackingUrl,
			},
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
