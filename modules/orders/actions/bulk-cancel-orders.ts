"use server";

import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { bulkCancelOrdersSchema } from "../schemas/order.schemas";

/**
 * Annule plusieurs commandes en masse
 * Réservé aux administrateurs
 *
 * Filtrage automatique :
 * - Seules les commandes non annulées seront traitées
 * - La logique de restauration de stock est appliquée pour chaque commande PENDING
 */
export async function bulkCancelOrders(
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
		const reason = formData.get("reason") as string | null;

		const validation = bulkCancelOrdersSchema.safeParse({
			ids,
			reason: reason || undefined,
		});

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = validation.data;

		// Filtrer les commandes éligibles (non annulées)
		const eligibleOrders = await prisma.order.findMany({
			where: {
				id: { in: validatedData.ids },
				status: { not: OrderStatus.CANCELLED },
			},
			select: {
				id: true,
				orderNumber: true,
				paymentStatus: true,
				items: {
					select: {
						skuId: true,
						quantity: true,
					},
				},
			},
		});

		if (eligibleOrders.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune commande éligible pour l'annulation.",
			};
		}

		let stockRestored = 0;
		let refundedCount = 0;

		// Transaction pour annuler toutes les commandes
		await prisma.$transaction(async (tx) => {
			for (const order of eligibleOrders) {
				// Déterminer le nouveau paymentStatus
				const newPaymentStatus =
					order.paymentStatus === PaymentStatus.PAID
						? PaymentStatus.REFUNDED
						: order.paymentStatus;

				if (newPaymentStatus === PaymentStatus.REFUNDED) {
					refundedCount++;
				}

				// Restaurer le stock uniquement si PENDING
				const shouldRestoreStock = order.paymentStatus === PaymentStatus.PENDING;

				// Mettre à jour la commande
				await tx.order.update({
					where: { id: order.id },
					data: {
						status: OrderStatus.CANCELLED,
						paymentStatus: newPaymentStatus,
					},
				});

				// Restaurer le stock si nécessaire
				if (shouldRestoreStock && order.items.length > 0) {
					for (const item of order.items) {
						await tx.productSku.update({
							where: { id: item.skuId },
							data: {
								inventory: {
									increment: item.quantity,
								},
							},
						});
					}
					stockRestored++;
				}
			}
		});

		revalidatePath("/admin/ventes/commandes");
		revalidatePath("/admin/catalogue/inventaire");

		const messages = [`${eligibleOrders.length} commande${eligibleOrders.length > 1 ? "s" : ""} annulée${eligibleOrders.length > 1 ? "s" : ""}.`];

		if (refundedCount > 0) {
			messages.push(`${refundedCount} passée${refundedCount > 1 ? "s" : ""} à REFUNDED.`);
		}

		if (stockRestored > 0) {
			messages.push(`Stock restauré pour ${stockRestored} commande${stockRestored > 1 ? "s" : ""}.`);
		}

		return {
			status: ActionStatus.SUCCESS,
			message: messages.join(" "),
		};
	} catch (error) {
		console.error("[BULK_CANCEL_ORDERS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de l'annulation des commandes.",
		};
	}
}
