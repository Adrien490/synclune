"use server";

import { HistorySource, OrderAction, RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { getRefundInvalidationTags } from "../constants/cache";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { hasOpenDisputeTx } from "@/modules/orders/services/has-open-dispute.service";
import { createRefundSchema } from "../schemas/refund.schemas";

/** Active refund statuses that count toward refunded amounts/quantities */
// SAFE: read-only frozen array of enum values, never mutated
// react-doctor-disable-next-line react-doctor/server-no-mutable-module-state
const ACTIVE_REFUND_STATUSES = [
	RefundStatus.PENDING,
	RefundStatus.APPROVED,
	RefundStatus.COMPLETED,
] as const;

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
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// Parser les données du formulaire
		const rawOrderId = safeFormGet(formData, "orderId");
		const rawReason = safeFormGet(formData, "reason");
		const note = safeFormGet(formData, "note");
		const items = safeFormGetJSON<unknown>(formData, "items");
		if (!items) return error("Format des articles invalide");

		const validated = validateInput(createRefundSchema, {
			orderId: rawOrderId,
			reason: rawReason,
			note,
			items,
			acceptCancelledOrder: safeFormGet(formData, "acceptCancelledOrder") === "true",
		});

		if ("error" in validated) return validated.error;

		const { orderId } = validated.data;

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
					// CACHE-AUDIT-010 : requis pour résoudre les tags user-scopés
					// (USER_ORDERS / LAST_ORDER / USER_ORDERS_COUNT) via le helper SSOT.
					userId: true,
					orderNumber: true,
					subtotal: true,
					discountAmount: true,
					total: true,
					currency: true,
					status: true,
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
										status: { in: [...ACTIVE_REFUND_STATUSES] },
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
							status: { in: [...ACTIVE_REFUND_STATUSES] },
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

			// ORD-REFUND-006: bloquer les commandes non-EUR (Stripe refund nécessite
			// que la devise du PaymentIntent match la commande, sinon refund FAILED).
			if (order.currency && order.currency.toUpperCase() !== "EUR") {
				throw new Error(`CURRENCY_NOT_SUPPORTED:${order.currency}`);
			}

			// ORD-STRIPE-007 : bloque si un dispute Stripe est ouvert sur la commande.
			// Cumul refund + chargeback = double dépense côté merchant.
			if (await hasOpenDisputeTx(tx, orderId)) {
				throw new Error("OPEN_DISPUTE");
			}

			// Vérifier que la commande est payée (ou partiellement remboursée)
			if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
				throw new Error(
					order.paymentStatus === "REFUNDED" ? "ORDER_ALREADY_REFUNDED" : "ORDER_NOT_PAID",
				);
			}

			// ORD-REFUND-AUDIT-003 : warning bloquant pour refund sur commande
			// déjà annulée. UI affiche une checkbox conditionnelle qui pose
			// `acceptCancelledOrder=true` ; sans confirmation explicite l'action
			// throw → admin re-vérifie qu'il ne rembourse pas par erreur après
			// un cancel-order qui aurait pu déjà déclencher un voidInvoice.
			if (order.status === "CANCELLED" && !validated.data.acceptCancelledOrder) {
				throw new Error("ORDER_CANCELLED_NEEDS_CONFIRMATION");
			}

			// Calculer le montant déjà remboursé (PENDING + APPROVED + COMPLETED)
			const alreadyRefunded = order.refunds.reduce((sum, r) => sum + r.amount, 0);
			const maxRefundable = order.total - alreadyRefunded;

			// Proratiser la réduction sur chaque article
			const discountRatio =
				order.subtotal > 0 && order.discountAmount > 0
					? Math.min(order.discountAmount / order.subtotal, 1)
					: 0;

			// Valider les items et calculer le montant total
			let totalAmount = 0;
			const validatedItems: Array<{
				orderItemId: string;
				quantity: number;
				amount: number;
				restock: boolean;
			}> = [];

			// Index construit une fois : un `find` par item était quadratique.
			const orderItemsById = new Map(order.items.map((oi) => [oi.id, oi]));

			for (const item of validated.data.items) {
				const orderItem = orderItemsById.get(item.orderItemId);

				if (!orderItem) {
					throw new Error("INVALID_ITEMS");
				}

				// Calculer la quantité déjà remboursée pour cet article
				// (filtered by active refund status in the query above)
				const alreadyRefundedQuantity = orderItem.refundItems.reduce(
					(sum, ri) => sum + ri.quantity,
					0,
				);
				const availableQuantity = orderItem.quantity - alreadyRefundedQuantity;

				if (item.quantity > availableQuantity) {
					throw new Error(`QUANTITY_EXCEEDS:${availableQuantity}`);
				}

				// Cap the amount to the maximum possible for this item (after discount proration)
				const maxItemAmount = Math.round(orderItem.price * item.quantity * (1 - discountRatio));
				const itemAmount = Math.min(item.amount, maxItemAmount);

				if (item.amount > maxItemAmount) {
					logger.warn(
						`Amount capped for item ${item.orderItemId}: ${item.amount} → ${maxItemAmount} (order ${orderId})`,
					);
				}

				// Utiliser le restock fourni, sinon déterminer automatiquement selon le motif
				const shouldRestock = item.restock;

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

			// ORD-REFUND-001: audit trail conformité L123-22
			// ORD-REFUND-007: trace si commande déjà CANCELLED (refund post-cancel)
			// ORD-REFUND-AUDIT-006 : items listés en metadata pour audit forensic
			// self-contained (litige client « j'ai été remboursé du mauvais bijou »)
			await createOrderAuditTx(tx, {
				orderId,
				action: OrderAction.REFUND_CREATED,
				source: HistorySource.ADMIN,
				authorId: adminUser.id,
				authorName: adminUser.name ?? adminUser.email,
				note: sanitizedNote ?? undefined,
				metadata: {
					refundId: refund.id,
					amount: totalAmount,
					reason: validated.data.reason,
					itemCount: validatedItems.length,
					items: validatedItems.map((i) => ({
						orderItemId: i.orderItemId,
						quantity: i.quantity,
						amount: i.amount,
						restock: i.restock,
					})),
					context: order.status === "CANCELLED" ? "cancelled-order" : "standard",
				},
			});

			return { refund, totalAmount, userId: order.userId };
		});

		// CACHE-AUDIT-010 : passer par le helper SSOT. La liste manuelle omettait
		// DETAIL(orderId) / HISTORY(orderId) alors que cette action écrit une entrée
		// d'OrderHistory affichée sur la page détail de la commande — celle-ci restait
		// périmée jusqu'à expiration du profil `user`.
		// Le duo refund écrit à la main à côté est désormais `getRefundInvalidationTags`
		// (même SSOT que les handlers webhook, qui l'oubliaient partiellement).
		// `Set` : les deux helpers se recouvrent sur DETAIL/HISTORY/ADMIN_BADGES.
		for (const tag of new Set([
			...getOrderInvalidationTags(orderId),
			...getRefundInvalidationTags(result.refund.id, orderId),
		])) {
			updateTag(tag);
		}

		return success(
			`Demande de remboursement créée pour ${(result.totalAmount / 100).toFixed(2)} €`,
			{ refundId: result.refund.id },
		);
	} catch (e) {
		// Handle business errors from the transaction
		if (e instanceof Error) {
			switch (e.message) {
				case "ORDER_NOT_FOUND":
					return error(REFUND_ERROR_MESSAGES.ORDER_NOT_FOUND);
				case "ORDER_NOT_PAID":
					return error("Cette commande n'a pas été payée et ne peut pas être remboursée.");
				case "ORDER_ALREADY_REFUNDED":
					return error("Cette commande est déjà totalement remboursée.");
				case "ORDER_CANCELLED_NEEDS_CONFIRMATION":
					return error(REFUND_ERROR_MESSAGES.ORDER_CANCELLED_NEEDS_CONFIRMATION);
				case "OPEN_DISPUTE":
					return error(REFUND_ERROR_MESSAGES.OPEN_DISPUTE);
				case "INVALID_ITEMS":
					return error(REFUND_ERROR_MESSAGES.INVALID_ITEMS);
				case "AMOUNT_ZERO":
					return error("Le montant du remboursement doit être supérieur à 0.");
			}
			if (e.message.startsWith("QUANTITY_EXCEEDS:")) {
				const available = e.message.split(":")[1];
				return error(
					`${REFUND_ERROR_MESSAGES.QUANTITY_EXCEEDS_AVAILABLE} (Article: max ${available} disponible)`,
				);
			}
			if (e.message.startsWith("AMOUNT_EXCEEDS:")) {
				const max = Number(e.message.split(":")[1]);
				return error(
					`${REFUND_ERROR_MESSAGES.AMOUNT_EXCEEDS_REMAINING} (Max: ${(max / 100).toFixed(2)} €)`,
				);
			}
			if (e.message.startsWith("CURRENCY_NOT_SUPPORTED:")) {
				const curr = e.message.split(":")[1] ?? "?";
				return error(
					`Cette commande est en devise ${curr.toUpperCase()} — seuls les remboursements en EUR sont supportés.`,
				);
			}
		}
		return handleActionError(e, REFUND_ERROR_MESSAGES.CREATE_FAILED);
	}
}
