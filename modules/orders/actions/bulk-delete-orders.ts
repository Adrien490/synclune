"use server";

import { PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		const idsRaw = formData.get("ids") as string;
		const ids = idsRaw ? JSON.parse(idsRaw) : [];

		const result = bulkDeleteOrdersSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Récupérer les commandes pour vérifier leur éligibilité
		const orders = await prisma.order.findMany({
			where: {
				id: { in: result.data.ids },
			},
			select: {
				id: true,
				orderNumber: true,
				userId: true,
				// TODO: Ajouter invoiceNumber au schéma Prisma quand la feature factures sera implémentée
				paymentStatus: true,
			},
		});

		// Filtrer les commandes éligibles à la suppression
		// TODO: Ajouter vérification invoiceNumber === null quand la feature factures sera implémentée
		const deletableOrders = orders.filter(
			(order) =>
				order.paymentStatus !== PaymentStatus.PAID &&
				order.paymentStatus !== PaymentStatus.REFUNDED
		);

		const deletableIds = deletableOrders.map((order) => order.id);
		const skippedCount = orders.length - deletableIds.length;

		if (deletableIds.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.BULK_DELETE_NONE_ELIGIBLE,
			};
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
		revalidatePath("/admin/ventes/commandes");

		const message =
			skippedCount > 0
				? `${deletableIds.length} commande(s) supprimée(s), ${skippedCount} ignorée(s) (facturées ou payées)`
				: `${deletableIds.length} commande(s) supprimée(s)`;

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_DELETE_ORDERS]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.DELETE_FAILED,
		};
	}
}
