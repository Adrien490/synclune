"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { RefundAction } from "@/app/generated/prisma/client";
import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { createRefundSchema } from "../schemas/refund.schemas";
import { shouldRestockByDefault } from "../utils/refund-utils";

/**
 * Crée un remboursement (statut PENDING)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Vérifie que la commande existe et est payée
 * - Vérifie que les articles demandés existent dans la commande
 * - Vérifie que les quantités ne dépassent pas les quantités disponibles
 * - Calcule le montant total du remboursement
 */
export async function createRefund(
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

		// Parser les données du formulaire
		const orderId = formData.get("orderId") as string;
		const reason = formData.get("reason") as string;
		const note = formData.get("note") as string | null;
		const itemsRaw = formData.get("items") as string;

		let items;
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des articles invalide",
			};
		}

		const result = createRefundSchema.safeParse({
			orderId,
			reason,
			note,
			items,
		});

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Récupérer la commande avec ses items (exclure les commandes soft-deleted)
		const order = await prisma.order.findUnique({
			where: { id: orderId, deletedAt: null },
			select: {
				id: true,
				orderNumber: true,
				total: true,
				paymentStatus: true,
				stripePaymentIntentId: true,
				stripeChargeId: true,
				items: {
					select: {
						id: true,
						quantity: true,
						price: true,
						refundItems: {
							select: {
								quantity: true,
							},
						},
					},
				},
				refunds: {
					select: {
						amount: true,
						status: true,
					},
				},
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: REFUND_ERROR_MESSAGES.ORDER_NOT_FOUND,
			};
		}

		// Vérifier que la commande est payée
		if (order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED") {
			return {
				status: ActionStatus.ERROR,
				message: "Cette commande n'a pas été payée et ne peut pas être remboursée.",
			};
		}

		// Calculer le montant déjà remboursé
		const alreadyRefunded = order.refunds
			.filter((r) => r.status === "COMPLETED")
			.reduce((sum, r) => sum + r.amount, 0);

		const maxRefundable = order.total - alreadyRefunded;

		// Valider les items et calculer le montant total
		let totalAmount = 0;
		const validatedItems: Array<{
			orderItemId: string;
			quantity: number;
			amount: number;
			restock: boolean;
		}> = [];

		for (const item of result.data.items) {
			const orderItem = order.items.find((oi) => oi.id === item.orderItemId);

			if (!orderItem) {
				return {
					status: ActionStatus.ERROR,
					message: REFUND_ERROR_MESSAGES.INVALID_ITEMS,
				};
			}

			// Calculer la quantité déjà remboursée pour cet article
			const alreadyRefundedQuantity = orderItem.refundItems.reduce(
				(sum, ri) => sum + ri.quantity,
				0
			);
			const availableQuantity = orderItem.quantity - alreadyRefundedQuantity;

			if (item.quantity > availableQuantity) {
				return {
					status: ActionStatus.ERROR,
					message: `${REFUND_ERROR_MESSAGES.QUANTITY_EXCEEDS_AVAILABLE} (Article: max ${availableQuantity} disponible)`,
				};
			}

			// Utiliser le montant fourni ou calculer à partir du prix unitaire
			const itemAmount = item.amount || orderItem.price * item.quantity;

			// Utiliser le restock fourni, sinon déterminer automatiquement selon le motif
			const shouldRestock = item.restock ?? shouldRestockByDefault(result.data.reason);

			validatedItems.push({
				orderItemId: item.orderItemId,
				quantity: item.quantity,
				amount: itemAmount,
				restock: shouldRestock,
			});

			totalAmount += itemAmount;
		}

		// Vérifier que le montant total ne dépasse pas le maximum remboursable
		if (totalAmount > maxRefundable) {
			return {
				status: ActionStatus.ERROR,
				message: `${REFUND_ERROR_MESSAGES.AMOUNT_EXCEEDS_REMAINING} (Max: ${(maxRefundable / 100).toFixed(2)} €)`,
			};
		}

		// Récupérer l'ID de l'admin
		const session = await getSession();

		// Créer le remboursement avec ses items et l'historique
		const refund = await prisma.refund.create({
			data: {
				orderId,
				amount: totalAmount,
				reason: result.data.reason,
				note: result.data.note,
				createdBy: session?.user?.id,
				items: {
					create: validatedItems.map((item) => ({
						orderItemId: item.orderItemId,
						quantity: item.quantity,
						amount: item.amount,
						restock: item.restock,
					})),
				},
				history: {
					create: {
						action: RefundAction.CREATED,
						authorId: session?.user?.id,
						note: `Demande de remboursement créée pour ${(totalAmount / 100).toFixed(2)} €`,
					},
				},
			},
			select: {
				id: true,
			},
		});

		revalidatePath("/admin/ventes/remboursements");
		revalidatePath("/admin/ventes/commandes");

		return {
			status: ActionStatus.SUCCESS,
			message: `Demande de remboursement créée pour ${(totalAmount / 100).toFixed(2)} €`,
			data: { refundId: refund.id },
		};
	} catch (error) {
		console.error("[CREATE_REFUND]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.CREATE_FAILED,
		};
	}
}
