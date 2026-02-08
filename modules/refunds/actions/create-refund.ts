"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";


import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { createRefundSchema } from "../schemas/refund.schemas";
import { shouldRestockByDefault } from "../services/refund-restock.service";

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
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// Parser les données du formulaire
		const orderId = formData.get("orderId") as string;
		const reason = formData.get("reason") as string;
		const note = formData.get("note") as string | null;
		const itemsRaw = formData.get("items") as string;

		let items;
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			return error("Format des articles invalide");
		}

		const validated = validateInput(createRefundSchema, {
			orderId,
			reason,
			note,
			items,
		});

		if ("error" in validated) return validated.error;

		// Sanitiser le texte libre
		const sanitizedNote = validated.data.note ? sanitizeText(validated.data.note) : null;

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

		// Vérifier que la commande est payée (ou partiellement remboursée)
		if (
			order.paymentStatus !== "PAID" &&
			order.paymentStatus !== "PARTIALLY_REFUNDED" &&
			order.paymentStatus !== "REFUNDED"
		) {
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

		for (const item of validated.data.items) {
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
			const shouldRestock = item.restock ?? shouldRestockByDefault(validated.data.reason);

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

		// Créer le remboursement avec ses items
		const refund = await prisma.refund.create({
			data: {
				orderId,
				amount: totalAmount,
				reason: validated.data.reason,
				note: sanitizedNote,
				createdBy: adminUser.id,
				items: {
					create: validatedItems.map((item) => ({
						orderItemId: item.orderItemId,
						quantity: item.quantity,
						amount: item.amount,
						restock: item.restock,
					})),
				},
			},
			select: {
				id: true,
			},
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return {
			status: ActionStatus.SUCCESS,
			message: `Demande de remboursement créée pour ${(totalAmount / 100).toFixed(2)} €`,
			data: { refundId: refund.id },
		};
	} catch (error) {
		return handleActionError(error, REFUND_ERROR_MESSAGES.CREATE_FAILED);
	}
}
