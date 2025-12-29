import { cacheLife, cacheTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { REVIEWS_CACHE_TAGS } from "../constants/cache"
import { REVIEW_PUBLIC_SELECT, REVIEW_ADMIN_SELECT } from "../constants/review.constants"
import type { ReviewPublic, ReviewAdmin } from "../types/review.types"

/**
 * Récupère un avis par son ID (version publique)
 * Ne retourne que les avis publiés et non supprimés
 *
 * @param reviewId - ID de l'avis
 * @returns L'avis ou null si introuvable/non publié
 */
export async function getReviewById(reviewId: string): Promise<ReviewPublic | null> {
	"use cache"
	cacheLife("products")
	cacheTag(REVIEWS_CACHE_TAGS.DETAIL(reviewId))

	return prisma.productReview.findFirst({
		where: {
			id: reviewId,
			status: "PUBLISHED",
			...notDeleted,
		},
		select: REVIEW_PUBLIC_SELECT,
	}) as Promise<ReviewPublic | null>
}

/**
 * Récupère un avis par son ID (version admin)
 * Retourne tous les avis, y compris masqués
 *
 * @param reviewId - ID de l'avis
 * @returns L'avis ou null si introuvable
 */
export async function getReviewByIdAdmin(reviewId: string): Promise<ReviewAdmin | null> {
	"use cache"
	cacheLife("dashboard")
	cacheTag(REVIEWS_CACHE_TAGS.DETAIL(reviewId))

	return prisma.productReview.findFirst({
		where: {
			id: reviewId,
			...notDeleted,
		},
		select: REVIEW_ADMIN_SELECT,
	}) as Promise<ReviewAdmin | null>
}

/**
 * Vérifie si un avis existe et appartient à un utilisateur
 * Utilisé pour vérifier les permissions de modification/suppression
 *
 * @param reviewId - ID de l'avis
 * @param userId - ID de l'utilisateur
 * @returns L'avis avec infos minimales ou null
 */
export async function getReviewOwnership(
	reviewId: string,
	userId: string
): Promise<{ id: string; productId: string; userId: string } | null> {
	"use cache"
	cacheLife("session")
	cacheTag(REVIEWS_CACHE_TAGS.USER(userId))

	return prisma.productReview.findFirst({
		where: {
			id: reviewId,
			userId,
			...notDeleted,
		},
		select: {
			id: true,
			productId: true,
			userId: true,
		},
	})
}
