"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, logOrderStatusChange } from "@/shared/lib/prisma";
import { getSession } from "@/shared/utils/get-session";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { markAsProcessingSchema } from "../schemas/order.schemas";

/**
 * Passe une commande payée en cours de préparation
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être en PENDING
 * - La commande doit être payée (PaymentStatus.PAID)
 * - La commande ne doit pas être annulée
 * - Passe OrderStatus à PROCESSING
 * - Passe FulfillmentStatus à PROCESSING
 */
export async function markAsProcessing(
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
		const sendEmail = formData.get("sendEmail") as string | null;

		const result = markAsProcessingSchema.safeParse({
			id,
			sendEmail: sendEmail || "false",
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
				paymentStatus: true,
				fulfillmentStatus: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier si déjà en préparation ou plus avancée
		if (order.status === OrderStatus.PROCESSING) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.ALREADY_PROCESSING,
			};
		}

		if (
			order.status === OrderStatus.SHIPPED ||
			order.status === OrderStatus.DELIVERED
		) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_NOT_PENDING,
			};
		}

		// Vérifier si annulée
		if (order.status === OrderStatus.CANCELLED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_CANCELLED,
			};
		}

		// Vérifier si payée
		if (order.paymentStatus !== PaymentStatus.PAID) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_UNPAID,
			};
		}

		// Mettre à jour la commande
		await prisma.order.update({
			where: { id },
			data: {
				status: OrderStatus.PROCESSING,
				fulfillmentStatus: FulfillmentStatus.PROCESSING,
			},
		});

		// Enregistrer l'historique des changements de statut (audit trail)
		await logOrderStatusChange({
			orderId: id,
			field: "status",
			previousStatus: order.status,
			newStatus: OrderStatus.PROCESSING,
			changedBy: adminUserId,
			reason: "Passage en préparation",
		});

		await logOrderStatusChange({
			orderId: id,
			field: "fulfillmentStatus",
			previousStatus: order.fulfillmentStatus,
			newStatus: FulfillmentStatus.PROCESSING,
			changedBy: adminUserId,
		});

		revalidatePath("/admin/ventes/commandes");

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} passée en préparation.`,
		};
	} catch (error) {
		console.error("[MARK_AS_PROCESSING]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.MARK_AS_PROCESSING_FAILED,
		};
	}
}
