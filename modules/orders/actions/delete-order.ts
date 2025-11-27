"use server";

import { PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { deleteOrderSchema } from "../schemas/order.schemas";

/**
 * Supprime une commande
 * Réservé aux administrateurs
 *
 * Règles métier (conformité comptable) :
 * - Une commande peut être supprimée UNIQUEMENT si :
 *   1. Aucune facture n'a été émise (invoiceNumber === null)
 *   2. Elle n'a jamais été payée (paymentStatus !== PAID et !== REFUNDED)
 *
 * - Une commande NE PEUT PAS être supprimée si :
 *   1. Une facture a été émise (invoiceNumber !== null)
 *      → La numérotation des factures doit être séquentielle sans "trou"
 *   2. Elle a été payée (même si remboursée ensuite)
 *      → Pour préserver la traçabilité comptable
 *
 * Dans ces cas, utilisez cancelOrder() à la place.
 */
export async function deleteOrder(
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

		const result = deleteOrderSchema.safeParse({ id });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		// Récupérer la commande avec les infos nécessaires
		const order = await prisma.order.findUnique({
			where: { id },
			select: {
				id: true,
				orderNumber: true,
				invoiceNumber: true,
				paymentStatus: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Règle 1 : Vérifier qu'aucune facture n'a été émise
		if (order.invoiceNumber !== null) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.HAS_INVOICE,
			};
		}

		// Règle 2 : Vérifier que la commande n'a jamais été payée
		// PAID ou REFUNDED signifie qu'il y a eu un paiement
		if (
			order.paymentStatus === PaymentStatus.PAID ||
			order.paymentStatus === PaymentStatus.REFUNDED
		) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_DELETE_PAID,
			};
		}

		// Suppression autorisée (commande de test, abandonnée, ou échouée)
		await prisma.order.delete({ where: { id } });

		revalidatePath("/admin/ventes/commandes");

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} supprimée.`,
		};
	} catch (error) {
		console.error("[DELETE_ORDER]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.DELETE_FAILED,
		};
	}
}
