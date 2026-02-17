import { cacheLife, cacheTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { REVIEWS_CACHE_TAGS } from "../constants/cache"
import { REVIEW_PUBLIC_SELECT, REVIEW_ADMIN_SELECT } from "../constants/review.constants"
import type { ReviewPublic, ReviewAdmin } from "../types/review.types"
import { stripDeletedResponse } from "../utils/strip-deleted-response"

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

	const review = await prisma.productReview.findFirst({
		where: {
			id: reviewId,
			status: "PUBLISHED",
			...notDeleted,
		},
		select: REVIEW_PUBLIC_SELECT,
	})

	if (!review) return null
	return stripDeletedResponse(review) as unknown as ReviewPublic
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

	const review = await prisma.productReview.findFirst({
		where: {
			id: reviewId,
			...notDeleted,
		},
		select: REVIEW_ADMIN_SELECT,
	})

	if (!review) return null
	return stripDeletedResponse(review) as unknown as ReviewAdmin
}
