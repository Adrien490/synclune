"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { scheduleReviewRequestEmailsBulk } from "@/modules/webhooks/services/review-request.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { bulkMarkAsDeliveredSchema } from "../schemas/order.schemas";
import { getOrderInvalidationTags } from "../constants/cache";

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
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];
		const sendEmail = formData.get("sendEmail") as string | null;

		const validation = bulkMarkAsDeliveredSchema.safeParse({
			ids,
			sendEmail: sendEmail || "false",
		});

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = validation.data;

		// Filtrer les commandes éligibles (SHIPPED uniquement)
		const eligibleOrders = await prisma.order.findMany({
			where: {
				id: { in: validatedData.ids },
				status: OrderStatus.SHIPPED,
			},
			select: { id: true, orderNumber: true, userId: true },
		});

		if (eligibleOrders.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune commande éligible (doivent être au statut SHIPPED).",
			};
		}

		const eligibleIds = eligibleOrders.map((o) => o.id);
		const deliveryDate = new Date();

		// Mettre à jour toutes les commandes
		const result = await prisma.order.updateMany({
			where: { id: { in: eligibleIds } },
			data: {
				status: OrderStatus.DELIVERED,
				fulfillmentStatus: FulfillmentStatus.DELIVERED,
				actualDelivery: deliveryDate,
			},
		});

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
		revalidatePath("/admin/ventes/commandes");

		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} commande${result.count > 1 ? "s" : ""} marquée${result.count > 1 ? "s" : ""} comme livrée${result.count > 1 ? "s" : ""}.`,
		};
	} catch (error) {
		console.error("[BULK_MARK_AS_DELIVERED]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la mise à jour des commandes.",
		};
	}
}
