"use server";

import { PaymentStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma, softDelete } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
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
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const id = formData.get("id") as string;

		const validated = validateInput(deleteOrderSchema, { id });
		if ("error" in validated) return validated.error;

		// Récupérer la commande avec les infos nécessaires
		const order = await prisma.order.findUnique({
			where: { id },
			select: {
				id: true,
				orderNumber: true,
				userId: true,
				// ROADMAP: Invoices - add invoiceNumber to select
				paymentStatus: true,
			},
		});

		if (!order) {
			return error(ORDER_ERROR_MESSAGES.NOT_FOUND);
		}

		// ROADMAP: Invoices - check invoiceNumber === null before allowing delete

		// Règle 2 : Vérifier que la commande n'a jamais été payée
		// PAID ou REFUNDED signifie qu'il y a eu un paiement
		if (
			order.paymentStatus === PaymentStatus.PAID ||
			order.paymentStatus === PaymentStatus.REFUNDED
		) {
			return error(ORDER_ERROR_MESSAGES.CANNOT_DELETE_PAID);
		}

		// Soft delete autorisé (commande de test, abandonnée, ou échouée)
		// Conformité Art. L123-22 Code de Commerce : conservation 10 ans
		await softDelete.order(id);

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));
		revalidatePath("/admin/ventes/commandes");

		return success(`Commande ${order.orderNumber} supprimee.`);
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.DELETE_FAILED);
	}
}
