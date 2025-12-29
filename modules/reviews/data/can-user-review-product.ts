import { cacheReviewableProducts } from "../constants/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import type { CanReviewResult } from "../types/review.types"

/**
 * Vérifie si un utilisateur peut laisser un avis sur un produit
 *
 * Conditions requises:
 * 1. L'utilisateur n'a pas déjà laissé un avis sur ce produit
 * 2. L'utilisateur a commandé ce produit
 * 3. La commande a été livrée (DELIVERED)
 *
 * @param userId - ID de l'utilisateur
 * @param productId - ID du produit
 * @returns Résultat avec raison si refus
 */
export async function canUserReviewProduct(
	userId: string,
	productId: string
): Promise<CanReviewResult> {
	"use cache"
	cacheReviewableProducts(userId)

	// 1. Vérifier s'il a déjà laissé un avis
	const existingReview = await prisma.productReview.findUnique({
		where: {
			userId_productId: { userId, productId },
		},
		select: { id: true, deletedAt: true },
	})

	if (existingReview && !existingReview.deletedAt) {
		return {
			canReview: false,
			orderItemId: null,
			reason: "already_reviewed",
			existingReviewId: existingReview.id,
		}
	}

	// 2. Trouver un OrderItem livré sans avis associé
	const eligibleOrderItem = await prisma.orderItem.findFirst({
		where: {
			order: {
				userId,
				fulfillmentStatus: "DELIVERED",
				...notDeleted,
			},
			sku: {
				productId,
				...notDeleted,
			},
			// Pas de review associée à cet OrderItem
			review: null,
		},
		select: { id: true },
		orderBy: {
			order: { createdAt: "desc" },
		},
	})

	if (!eligibleOrderItem) {
		// Vérifier si c'est parce qu'il n'a pas acheté ou pas encore livré
		const pendingOrder = await prisma.orderItem.findFirst({
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
		})

		if (pendingOrder) {
			return {
				canReview: false,
				orderItemId: null,
				reason: "order_not_delivered",
			}
		}

		return {
			canReview: false,
			orderItemId: null,
			reason: "no_purchase",
		}
	}

	return {
		canReview: true,
		orderItemId: eligibleOrderItem.id,
	}
}

/**
 * Vérifie si l'utilisateur peut modifier un avis existant
 * (doit être l'auteur de l'avis)
 *
 * @param userId - ID de l'utilisateur
 * @param reviewId - ID de l'avis
 * @returns true si l'utilisateur peut modifier l'avis
 */
export async function canUserEditReview(
	userId: string,
	reviewId: string
): Promise<boolean> {
	"use cache"
	cacheReviewableProducts(userId)

	const review = await prisma.productReview.findFirst({
		where: {
			id: reviewId,
			userId,
			...notDeleted,
		},
		select: { id: true },
	})

	return review !== null
}
