"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, logOrderStatusChange } from "@/shared/lib/prisma";
import { getSession } from "@/shared/utils/get-session";
import { sendReturnConfirmationEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { markAsReturnedSchema } from "../schemas/order.schemas";

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
			where: { id },
			select: {
				id: true,
				orderNumber: true,
				status: true,
				fulfillmentStatus: true,
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

		// Mettre à jour la commande
		await prisma.order.update({
			where: { id },
			data: {
				fulfillmentStatus: FulfillmentStatus.RETURNED,
			},
		});

		// Enregistrer l'historique des changements de statut (audit trail)
		await logOrderStatusChange({
			orderId: id,
			field: "fulfillmentStatus",
			previousStatus: order.fulfillmentStatus,
			newStatus: FulfillmentStatus.RETURNED,
			changedBy: adminUserId,
			reason: result.data.reason || "Colis retourné",
		});

		revalidatePath("/admin/ventes/commandes");

		// Envoyer l'email de confirmation de retour au client
		if (order.customerEmail) {
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
			const orderDetailsUrl = `${baseUrl}/compte/commandes/${order.orderNumber}`;

			await sendReturnConfirmationEmail({
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				orderTotal: order.total,
				reason: result.data.reason,
				orderDetailsUrl,
			});
		}

		const emailMessage = order.customerEmail ? " Email envoyé au client." : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme retournée.${emailMessage} Vous pouvez créer un remboursement si nécessaire.`,
		};
	} catch (error) {
		console.error("[MARK_AS_RETURNED]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.MARK_AS_RETURNED_FAILED,
		};
	}
}
