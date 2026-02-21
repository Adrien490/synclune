"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";


import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { createRefundSchema } from "../schemas/refund.schemas";
import { shouldRestockByDefault } from "../services/refund-restock.service";

/** Active refund statuses that count toward refunded amounts/quantities */
const ACTIVE_REFUND_STATUSES = [
	RefundStatus.PENDING,
	RefundStatus.APPROVED,
	RefundStatus.COMPLETED,
];

/**
 * Crée un remboursement (statut PENDING)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Vérifie que la commande existe et est payée
 * - Vérifie que les articles demandés existent dans la commande
 * - Vérifie que les quantités ne dépassent pas les quantités disponibles
 * - Calcule le montant total du remboursement
 * - Transaction atomique avec FOR UPDATE pour empêcher les double-refunds
 */
export async function createRefund(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

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

		// ========================================================================
		// Transaction atomique : lecture + validation + création
		// FOR UPDATE empêche les créations concurrentes sur la même commande
		// ========================================================================
		const result = await prisma.$transaction(async (tx) => {
			// Lock the order row to prevent concurrent refund creation
			const orderRows = await tx.$queryRaw<{ id: string }[]>`
				SELECT id FROM "Order"
				WHERE id = ${orderId} AND "deletedAt" IS NULL
				FOR UPDATE
			`;

			if (orderRows.length === 0) {
				throw new Error("ORDER_NOT_FOUND");
			}

			// Read order with items and refunds within the locked transaction
			const order = await tx.order.findUnique({
				where: { id: orderId, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					total: true,
					paymentStatus: true,
					stripePaymentIntentId: true,
					items: {
						select: {
							id: true,
							quantity: true,
							price: true,
							refundItems: {
								where: {
									refund: {
										status: { in: ACTIVE_REFUND_STATUSES },
									},
								},
								select: {
									quantity: true,
								},
							},
						},
					},
					refunds: {
						where: {
							status: { in: ACTIVE_REFUND_STATUSES },
						},
						select: {
							amount: true,
							status: true,
						},
					},
				},
			});

			if (!order) {
				throw new Error("ORDER_NOT_FOUND");
			}

			// Vérifier que la commande est payée (ou partiellement remboursée)
			if (
				order.paymentStatus !== "PAID" &&
				order.paymentStatus !== "PARTIALLY_REFUNDED" &&
				order.paymentStatus !== "REFUNDED"
			) {
				throw new Error("ORDER_NOT_PAID");
			}

			// Calculer le montant déjà remboursé (PENDING + APPROVED + COMPLETED)
			const alreadyRefunded = order.refunds.reduce((sum, r) => sum + r.amount, 0);
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
					throw new Error("INVALID_ITEMS");
				}

				// Calculer la quantité déjà remboursée pour cet article
				// (filtered by active refund status in the query above)
				const alreadyRefundedQuantity = orderItem.refundItems.reduce(
					(sum, ri) => sum + ri.quantity,
					0
				);
				const availableQuantity = orderItem.quantity - alreadyRefundedQuantity;

				if (item.quantity > availableQuantity) {
					throw new Error(`QUANTITY_EXCEEDS:${availableQuantity}`);
				}

				// Cap the amount to the maximum possible for this item
				const maxItemAmount = orderItem.price * item.quantity;
				const itemAmount = item.amount != null
					? Math.min(item.amount, maxItemAmount)
					: maxItemAmount;

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

			// Guard: montant doit être > 0
			if (totalAmount <= 0) {
				throw new Error("AMOUNT_ZERO");
			}

			// Vérifier que le montant total ne dépasse pas le maximum remboursable
			if (totalAmount > maxRefundable) {
				throw new Error(`AMOUNT_EXCEEDS:${maxRefundable}`);
			}

			// Créer le remboursement avec ses items (dans la même transaction)
			const refund = await tx.refund.create({
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

			return { refund, totalAmount };
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(orderId));

		return success(
			`Demande de remboursement créée pour ${(result.totalAmount / 100).toFixed(2)} €`,
			{ refundId: result.refund.id }
		);
	} catch (e) {
		// Handle business errors from the transaction
		if (e instanceof Error) {
			switch (e.message) {
				case "ORDER_NOT_FOUND":
					return error(REFUND_ERROR_MESSAGES.ORDER_NOT_FOUND);
				case "ORDER_NOT_PAID":
					return error("Cette commande n'a pas été payée et ne peut pas être remboursée.");
				case "INVALID_ITEMS":
					return error(REFUND_ERROR_MESSAGES.INVALID_ITEMS);
				case "AMOUNT_ZERO":
					return error("Le montant du remboursement doit être supérieur à 0.");
			}
			if (e.message.startsWith("QUANTITY_EXCEEDS:")) {
				const available = e.message.split(":")[1];
				return error(`${REFUND_ERROR_MESSAGES.QUANTITY_EXCEEDS_AVAILABLE} (Article: max ${available} disponible)`);
			}
			if (e.message.startsWith("AMOUNT_EXCEEDS:")) {
				const max = Number(e.message.split(":")[1]);
				return error(`${REFUND_ERROR_MESSAGES.AMOUNT_EXCEEDS_REMAINING} (Max: ${(max / 100).toFixed(2)} €)`);
			}
		}
		return handleActionError(e, REFUND_ERROR_MESSAGES.CREATE_FAILED);
	}
}
