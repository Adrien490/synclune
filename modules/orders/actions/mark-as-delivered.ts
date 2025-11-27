"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { markAsDeliveredSchema } from "../schemas/order.schemas";

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

		const id = formData.get("id") as string;

		const result = markAsDeliveredSchema.safeParse({ id });
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

		// Mettre à jour la commande
		await prisma.order.update({
			where: { id },
			data: {
				status: OrderStatus.DELIVERED,
				fulfillmentStatus: FulfillmentStatus.DELIVERED,
				actualDelivery: new Date(),
			},
		});

		revalidatePath("/admin/ventes/commandes");

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme livrée.`,
		};
	} catch (error) {
		console.error("[MARK_AS_DELIVERED]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.MARK_AS_DELIVERED_FAILED,
		};
	}
}
