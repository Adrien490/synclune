"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsProcessingSchema } from "../schemas/order.schemas";
import { createOrderAudit } from "../utils/order-audit";

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

		// Récupérer les infos de l'admin pour l'audit trail
		const session = await getSession();
		const adminId = session?.user?.id;
		const adminName = session?.user?.name || "Admin";

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
				userId: true,
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

		// 🔴 AUDIT TRAIL (Best Practice Stripe 2025)
		await createOrderAudit({
			orderId: id,
			action: "PROCESSING",
			previousStatus: order.status,
			newStatus: OrderStatus.PROCESSING,
			previousFulfillmentStatus: order.fulfillmentStatus,
			newFulfillmentStatus: FulfillmentStatus.PROCESSING,
			authorId: adminId,
			authorName: adminName,
			source: "admin",
		});

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));
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
