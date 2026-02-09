"use server";

import { PaymentStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { bulkDeleteOrdersSchema } from "../schemas/order.schemas";

/**
 * Supprime plusieurs commandes en masse
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seules les commandes éligibles seront supprimées
 * - Une commande est éligible si :
 *   1. Aucune facture n'a été émise (invoiceNumber === null)
 *   2. Elle n'a jamais été payée (paymentStatus !== PAID et !== REFUNDED)
 * - Les commandes non éligibles sont ignorées (avec compteur)
 */
export async function bulkDeleteOrders(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const idsRaw = formData.get("ids") as string;
		const ids = idsRaw ? JSON.parse(idsRaw) : [];

		const validated = validateInput(bulkDeleteOrdersSchema, { ids });
		if ("error" in validated) return validated.error;

		// Récupérer les commandes pour vérifier leur éligibilité
		const orders = await prisma.order.findMany({
			where: {
				id: { in: validated.data.ids },
			},
			select: {
				id: true,
				orderNumber: true,
				userId: true,
				// ROADMAP: Invoices - add invoiceNumber to select
				paymentStatus: true,
			},
		});

		// Filter orders eligible for deletion
		// ROADMAP: Invoices - add invoiceNumber === null check
		const deletableOrders = orders.filter(
			(order) =>
				order.paymentStatus !== PaymentStatus.PAID &&
				order.paymentStatus !== PaymentStatus.REFUNDED
		);

		const deletableIds = deletableOrders.map((order) => order.id);
		const skippedCount = orders.length - deletableIds.length;

		if (deletableIds.length === 0) {
			return error(ORDER_ERROR_MESSAGES.BULK_DELETE_NONE_ELIGIBLE);
		}

		// Soft delete des commandes éligibles (Art. L123-22 Code de Commerce - conservation 10 ans)
		await prisma.order.updateMany({
			where: { id: { in: deletableIds } },
			data: { deletedAt: new Date() },
		});

		// Invalider les caches pour chaque userId unique
		const uniqueUserIds = [...new Set(deletableOrders.map(o => o.userId).filter(Boolean))] as string[];
		uniqueUserIds.forEach(userId => {
			getOrderInvalidationTags(userId).forEach(tag => updateTag(tag));
		});
		// Toujours invalider la liste admin (même si pas d'userId)
		getOrderInvalidationTags().forEach(tag => updateTag(tag));

		const message =
			skippedCount > 0
				? `${deletableIds.length} commande(s) supprimee(s), ${skippedCount} ignoree(s) (facturees ou payees)`
				: `${deletableIds.length} commande(s) supprimee(s)`;

		return success(message);
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.DELETE_FAILED);
	}
}
