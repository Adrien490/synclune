import { notDeleted } from "@/shared/lib/prisma";
import type { prisma } from "@/shared/lib/prisma";
import type { PrismaTransaction } from "@/shared/types/prisma";

import type { CanReviewResult } from "../types/review.types";

/**
 * Type accepté : client Prisma global OU transaction `tx`. Permet d'utiliser cette
 * fonction depuis un Server Action (lecture fresh) ET depuis une transaction
 * (où `tx` est requis pour atomicité).
 */
export type PrismaClientOrTx = typeof prisma | PrismaTransaction;

/**
 * Vérifie si un utilisateur peut laisser un avis sur un produit — logique pure, fresh.
 *
 * Conditions :
 * 1. Pas d'avis actif déjà laissé par cet utilisateur sur ce produit.
 * 2. Au moins un OrderItem livré (`fulfillmentStatus = DELIVERED`) sans review liée.
 *
 * Cette fonction NE doit PAS être cachée. Elle est appelée :
 * - depuis `actions/create-review.ts` (mutation) pour décision d'autorisation fresh.
 * - depuis `data/can-user-review-product.ts` (lecture cachée) qui délègue puis cache
 *   le résultat pour l'UI (badge, bouton enabled/disabled).
 *
 * Voir audit reviews 2026-05-11 P1.8.
 */
export async function checkReviewEligibility(
	client: PrismaClientOrTx,
	userId: string,
	productId: string,
): Promise<CanReviewResult> {
	// 1. Vérifier s'il a déjà laissé un avis
	const existingReview = await client.productReview.findUnique({
		where: {
			userId_productId: { userId, productId },
		},
		select: { id: true, deletedAt: true },
	});

	// Un avis — même soft-deleted — verrouille définitivement la paire (userId, productId)
	// au niveau DB (`@@unique` non partielle) ET l'OrderItem associé (`orderItemId @unique`).
	// On applique donc la règle "un avis par produit et par utilisateur, définitivement" :
	// pour changer d'avis, l'utilisateur édite le sien (updateReview). Renvoyer ici un
	// `canReview: true` après suppression était trompeur — la création échouait ensuite en
	// P2002 avec un message "no_purchase" incohérent. Cf. REVIEW-AUDIT-003.
	if (existingReview) {
		return {
			canReview: false,
			orderItemId: null,
			reason: "already_reviewed",
			// Ne pas exposer l'id d'un avis supprimé (lien UI mort)
			...(existingReview.deletedAt ? {} : { existingReviewId: existingReview.id }),
		};
	}

	// 2. Trouver un OrderItem livré sans avis associé
	// Exclut les commandes annulées / intégralement remboursées / échouées — solliciter
	// ou autoriser un avis dans ces cas est incohérent métier (cohérent avec le cron
	// send-review-requests, biz-bug-001). PARTIALLY_REFUNDED reste éligible. Cf. REVIEW-AUDIT-004.
	const eligibleOrderItem = await client.orderItem.findFirst({
		where: {
			order: {
				userId,
				fulfillmentStatus: "DELIVERED",
				status: { not: "CANCELLED" },
				paymentStatus: { notIn: ["REFUNDED", "FAILED", "EXPIRED"] },
				...notDeleted,
			},
			sku: {
				productId,
				...notDeleted,
			},
			review: null,
		},
		select: { id: true },
		orderBy: {
			order: { createdAt: "desc" },
		},
	});

	if (!eligibleOrderItem) {
		// Vérifier si c'est parce qu'il n'a pas acheté ou pas encore livré
		const pendingOrder = await client.orderItem.findFirst({
			where: {
				order: {
					userId,
					fulfillmentStatus: { not: "DELIVERED" },
					...notDeleted,
				},
				sku: {
					productId,
					...notDeleted,
				},
			},
			select: { id: true },
		});

		if (pendingOrder) {
			return {
				canReview: false,
				orderItemId: null,
				reason: "order_not_delivered",
			};
		}

		return {
			canReview: false,
			orderItemId: null,
			reason: "no_purchase",
		};
	}

	return {
		canReview: true,
		orderItemId: eligibleOrderItem.id,
	};
}
