"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { bulkMarkAsDeliveredSchema } from "../schemas/order.schemas";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé. Droits administrateur requis.",
			};
		}

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
			select: { id: true, orderNumber: true },
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
