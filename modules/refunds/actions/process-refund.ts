"use server";

import { Prisma, PaymentStatus, RefundAction, RefundStatus } from "@/app/generated/prisma/client";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { createStripeRefund } from "../lib/stripe-refund";
import { processRefundSchema } from "../schemas/refund.schemas";

// Type pour le résultat de la query raw
type RefundLockRow = {
	id: string;
	status: string;
	amount: number;
	order_id: string;
	order_number: string;
	order_total: number;
	stripe_payment_intent_id: string | null;
	stripe_charge_id: string | null;
};

type RefundItemRow = {
	id: string;
	quantity: number;
	restock: boolean;
	sku_id: string;
};

type CompletedRefundRow = {
	amount: number;
};

/**
 * Traite un remboursement approuvé via Stripe
 * Réservé aux administrateurs
 *
 * Pattern SAGA pour garantir la cohérence :
 * 1. Verrouillage atomique du remboursement (FOR UPDATE)
 * 2. Appel Stripe avec clé d'idempotence
 * 3. Mise à jour finale avec restauration stock
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

		// Récupérer la session pour l'historique
		const session = await getSession();

		// ========================================================================
		// ÉTAPE 1: Verrouillage atomique et validation (FOR UPDATE)
		// Empêche les traitements concurrents du même remboursement
		// ========================================================================
		const refundData = await prisma.$transaction(async (tx) => {
			// Verrouiller le remboursement avec FOR UPDATE
			const refundRows = await tx.$queryRaw<RefundLockRow[]>`
				SELECT
					r.id,
					r.status::text,
					r.amount,
					o.id as order_id,
					o."orderNumber" as order_number,
					o.total as order_total,
					o."stripePaymentIntentId" as stripe_payment_intent_id,
					o."stripeChargeId" as stripe_charge_id
				FROM "Refund" r
				INNER JOIN "Order" o ON r."orderId" = o.id
				WHERE r.id = ${id}
				FOR UPDATE OF r
			`;

			if (refundRows.length === 0) {
				throw new Error("NOT_FOUND");
			}

			const refund = refundRows[0];

			// Vérifier le statut atomiquement
			if (refund.status === "COMPLETED") {
				throw new Error("ALREADY_PROCESSED");
			}
			if (refund.status !== "APPROVED") {
				throw new Error("NOT_APPROVED");
			}

			// Vérifier qu'on a un ID de paiement Stripe
			if (!refund.stripe_payment_intent_id && !refund.stripe_charge_id) {
				throw new Error("NO_CHARGE_ID");
			}

			// Récupérer les items du remboursement
			const items = await tx.$queryRaw<RefundItemRow[]>`
				SELECT
					ri.id,
					ri.quantity,
					ri.restock,
					oi."skuId" as sku_id
				FROM "RefundItem" ri
				INNER JOIN "OrderItem" oi ON ri."orderItemId" = oi.id
				WHERE ri."refundId" = ${id}
			`;

			// Récupérer le total déjà remboursé
			const completedRefunds = await tx.$queryRaw<CompletedRefundRow[]>`
				SELECT amount
				FROM "Refund"
				WHERE "orderId" = ${refund.order_id}
					AND status = 'COMPLETED'::"RefundStatus"
					AND id != ${id}
			`;

			// Enregistrer l'action PROCESSED (marque le début du traitement)
			await tx.refundHistory.create({
				data: {
					refundId: id,
					action: RefundAction.PROCESSED,
					authorId: session?.user?.id,
					note: "Envoi vers Stripe en cours",
				},
			});

			return {
				refund,
				items,
				totalRefundedBefore: completedRefunds.reduce((sum, r) => sum + r.amount, 0),
			};
		});

		// ========================================================================
		// ÉTAPE 2: Appel Stripe (hors transaction, avec idempotencyKey)
		// La clé d'idempotence garantit qu'un retry ne crée pas de doublon
		// ========================================================================
		const stripeResult = await createStripeRefund({
			paymentIntentId: refundData.refund.stripe_payment_intent_id || undefined,
			chargeId: refundData.refund.stripe_charge_id || undefined,
			amount: refundData.refund.amount,
			metadata: {
				refund_id: refundData.refund.id,
				order_number: refundData.refund.order_number,
				order_id: refundData.refund.order_id,
			},
			idempotencyKey: `refund_${id}`,
		});

		// P0.1: Gérer les différents états de retour Stripe
		if (!stripeResult.success && !stripeResult.pending) {
			// Marquer le remboursement comme échoué
			await prisma.$transaction(async (tx) => {
				await tx.refund.update({
					where: { id },
					data: { status: RefundStatus.FAILED },
				});

				await tx.refundHistory.create({
					data: {
						refundId: id,
						action: RefundAction.FAILED,
						authorId: session?.user?.id,
						note: `Échec Stripe: ${stripeResult.error || "Erreur inconnue"}`,
					},
				});
			});

			return {
				status: ActionStatus.ERROR,
				message: stripeResult.error || REFUND_ERROR_MESSAGES.STRIPE_ERROR,
			};
		}

		// P0.1: Si pending, garder APPROVED et attendre webhook refund.updated
		if (stripeResult.pending) {
			await prisma.$transaction(async (tx) => {
				// Mettre à jour avec l'ID Stripe mais garder APPROVED
				await tx.refund.update({
					where: { id },
					data: {
						stripeRefundId: stripeResult.refundId,
						// Status reste APPROVED - sera COMPLETED par webhook
					},
				});

				await tx.refundHistory.create({
					data: {
						refundId: id,
						action: RefundAction.PROCESSED,
						authorId: session?.user?.id,
						note: `Remboursement Stripe en attente de confirmation (${stripeResult.refundId})`,
					},
				});
			});

			return {
				status: ActionStatus.SUCCESS,
				message: `Remboursement de ${(refundData.refund.amount / 100).toFixed(2)} € envoyé à Stripe. En attente de confirmation.`,
				data: { stripeRefundId: stripeResult.refundId, pending: true },
			};
		}

		// ========================================================================
		// ÉTAPE 3: Finalisation (transaction atomique)
		// Met à jour le statut, restaure le stock, et update la commande
		// ========================================================================
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

			// 2. Ajouter l'entrée d'historique COMPLETED
			await tx.refundHistory.create({
				data: {
					refundId: id,
					action: RefundAction.COMPLETED,
					authorId: session?.user?.id,
					note: `Remboursement Stripe confirmé: ${stripeResult.refundId}`,
				},
			});

			// 3. Restaurer le stock pour les articles avec restock=true
			for (const item of refundData.items) {
				if (item.restock) {
					await tx.productSku.update({
						where: { id: item.sku_id },
						data: {
							inventory: { increment: item.quantity },
						},
					});
				}
			}

			// 4. Calculer si la commande est totalement ou partiellement remboursée
			const totalRefundedAfter = refundData.totalRefundedBefore + refundData.refund.amount;

			// Mettre à jour le paymentStatus selon le montant remboursé
			if (totalRefundedAfter >= refundData.refund.order_total) {
				await tx.order.update({
					where: { id: refundData.refund.order_id },
					data: { paymentStatus: PaymentStatus.REFUNDED },
				});
			} else if (totalRefundedAfter > 0) {
				await tx.order.update({
					where: { id: refundData.refund.order_id },
					data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
				});
			}
		});

		revalidatePath("/admin/ventes/remboursements");
		revalidatePath("/admin/ventes/commandes");
		revalidatePath("/admin/catalogue/inventaire");

		// Invalider le cache d'inventaire si des articles ont été restockés
		const restockedCount = refundData.items.filter((i) => i.restock).length;
		if (restockedCount > 0) {
			updateTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
			updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		}
		const restockMessage =
			restockedCount > 0
				? ` Stock restauré pour ${restockedCount} article(s).`
				: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refundData.refund.amount / 100).toFixed(2)} € traité avec succès.${restockMessage}`,
			data: { stripeRefundId: stripeResult.refundId },
		};
	} catch (error) {
		// Gestion des erreurs métier depuis la transaction de verrouillage
		if (error instanceof Error) {
			switch (error.message) {
				case "NOT_FOUND":
					return {
						status: ActionStatus.NOT_FOUND,
						message: REFUND_ERROR_MESSAGES.NOT_FOUND,
					};
				case "ALREADY_PROCESSED":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.ALREADY_PROCESSED,
					};
				case "NOT_APPROVED":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.NOT_APPROVED,
					};
				case "NO_CHARGE_ID":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.NO_CHARGE_ID,
					};
			}
		}

		console.error("[PROCESS_REFUND]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.PROCESS_FAILED,
		};
	}
}
