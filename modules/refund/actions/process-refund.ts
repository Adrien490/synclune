"use server";

import { PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { createStripeRefund } from "../lib/stripe-refund";
import { processRefundSchema } from "../schemas/refund.schemas";

/**
 * Traite un remboursement approuvé via Stripe
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Le remboursement doit être en statut APPROVED
 * - Appelle l'API Stripe pour créer le remboursement
 * - Restaure le stock (inventory) pour les articles avec restock=true
 * - Met à jour le paymentStatus de la commande à REFUNDED si remboursement total
 */
export async function processRefund(
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

		const result = processRefundSchema.safeParse({ id });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		// Récupérer le remboursement avec toutes les infos nécessaires
		const refund = await prisma.refund.findUnique({
			where: { id },
			select: {
				id: true,
				status: true,
				amount: true,
				order: {
					select: {
						id: true,
						orderNumber: true,
						total: true,
						stripePaymentIntentId: true,
						stripeChargeId: true,
						refunds: {
							where: {
								status: RefundStatus.COMPLETED,
							},
							select: {
								amount: true,
							},
						},
					},
				},
				items: {
					select: {
						id: true,
						quantity: true,
						restock: true,
						orderItem: {
							select: {
								skuId: true,
							},
						},
					},
				},
			},
		});

		if (!refund) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: REFUND_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier que le remboursement est approuvé
		if (refund.status !== RefundStatus.APPROVED) {
			if (refund.status === RefundStatus.COMPLETED) {
				return {
					status: ActionStatus.ERROR,
					message: REFUND_ERROR_MESSAGES.ALREADY_PROCESSED,
				};
			}
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.NOT_APPROVED,
			};
		}

		// Vérifier qu'on a un ID de paiement Stripe
		if (!refund.order.stripePaymentIntentId && !refund.order.stripeChargeId) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.NO_CHARGE_ID,
			};
		}

		// Appeler Stripe pour créer le remboursement
		// Utiliser l'ID du refund comme base de la clé d'idempotence pour éviter les doublons
		const stripeResult = await createStripeRefund({
			paymentIntentId: refund.order.stripePaymentIntentId || undefined,
			chargeId: refund.order.stripeChargeId || undefined,
			amount: refund.amount,
			metadata: {
				refund_id: refund.id,
				order_number: refund.order.orderNumber,
				order_id: refund.order.id,
			},
			idempotencyKey: `refund_${refund.id}`,
		});

		if (!stripeResult.success) {
			// Marquer le remboursement comme échoué
			await prisma.refund.update({
				where: { id },
				data: {
					status: RefundStatus.FAILED,
				},
			});

			return {
				status: ActionStatus.ERROR,
				message: stripeResult.error || REFUND_ERROR_MESSAGES.STRIPE_ERROR,
			};
		}

		// Transaction pour mettre à jour le remboursement et restaurer le stock
		await prisma.$transaction(async (tx) => {
			// 1. Mettre à jour le remboursement
			await tx.refund.update({
				where: { id },
				data: {
					status: RefundStatus.COMPLETED,
					stripeRefundId: stripeResult.refundId,
					processedAt: new Date(),
				},
			});

			// 2. Restaurer le stock pour les articles avec restock=true
			for (const item of refund.items) {
				if (item.restock) {
					await tx.productSku.update({
						where: { id: item.orderItem.skuId },
						data: {
							inventory: {
								increment: item.quantity,
							},
						},
					});
				}
			}

			// 3. Calculer si la commande est totalement ou partiellement remboursée
			const totalRefundedBefore = refund.order.refunds.reduce(
				(sum, r) => sum + r.amount,
				0
			);
			const totalRefundedAfter = totalRefundedBefore + refund.amount;

			// Mettre à jour le paymentStatus selon le montant remboursé
			if (totalRefundedAfter >= refund.order.total) {
				// Remboursement total
				await tx.order.update({
					where: { id: refund.order.id },
					data: {
						paymentStatus: PaymentStatus.REFUNDED,
					},
				});
			} else if (totalRefundedAfter > 0) {
				// Remboursement partiel
				await tx.order.update({
					where: { id: refund.order.id },
					data: {
						paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
					},
				});
			}
		});

		revalidatePath("/admin/ventes/remboursements");
		revalidatePath("/admin/ventes/commandes");
		revalidatePath("/admin/catalogue/inventaire");

		// Invalider le cache d'inventaire si des articles ont été restockés
		const restockedCount = refund.items.filter((i) => i.restock).length;
		if (restockedCount > 0) {
			updateTag(DASHBOARD_CACHE_TAGS.INVENTORY_LIST);
			updateTag(DASHBOARD_CACHE_TAGS.BADGES);
		}
		const restockMessage =
			restockedCount > 0
				? ` Stock restauré pour ${restockedCount} article(s).`
				: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refund.amount / 100).toFixed(2)} € traité avec succès.${restockMessage}`,
			data: { stripeRefundId: stripeResult.refundId },
		};
	} catch (error) {
		console.error("[PROCESS_REFUND]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.PROCESS_FAILED,
		};
	}
}
