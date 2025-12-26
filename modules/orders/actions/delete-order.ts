"use server";

import { PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, softDelete } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
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
				userId: true,
				// TODO: Ajouter invoiceNumber au schéma Prisma quand la feature factures sera implémentée
				paymentStatus: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// TODO: Règle 1 - Vérifier invoiceNumber === null quand la feature factures sera implémentée

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

		// Soft delete autorisé (commande de test, abandonnée, ou échouée)
		// Conformité Art. L123-22 Code de Commerce : conservation 10 ans
		await softDelete.order(id);

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));
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
