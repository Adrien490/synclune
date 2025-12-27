"use server"

import { updateTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import {
	requireAdminWithUser,
	success,
	notFound,
	error,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"

import { REVIEWS_CACHE_TAGS, getReviewModerationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { createReviewResponseSchema } from "../schemas/review.schemas"

/**
 * Crée une réponse admin à un avis
 * Action admin uniquement
 */
export async function createReviewResponse(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification authentification + admin (un seul appel)
		const auth = await requireAdminWithUser()
		if ("error" in auth) return auth.error

		const user = auth.user

		// 2. Extraire et valider les données
		const rawData = {
			reviewId: formData.get("reviewId"),
			content: formData.get("content"),
		}

		const validation = createReviewResponseSchema.safeParse(rawData)
		if (!validation.success) {
			return validationError(validation.error.issues[0]?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA)
		}

		const { reviewId, content } = validation.data

		// 3. Vérifier que l'avis existe et n'a pas déjà de réponse
		const review = await prisma.productReview.findFirst({
			where: {
				id: reviewId,
				...notDeleted,
			},
			select: {
				id: true,
				productId: true,
				response: {
					select: { id: true },
				},
			},
		})

		if (!review) {
			return notFound("Avis")
		}

		if (review.response) {
			return error(REVIEW_ERROR_MESSAGES.RESPONSE_ALREADY_EXISTS)
		}

		// 4. Créer la réponse
		const response = await prisma.reviewResponse.create({
			data: {
				reviewId,
				content,
				authorId: user.id,
				authorName: user.name || "Équipe Synclune",
			},
			select: {
				id: true,
			},
		})

		// 5. Invalider le cache
		const tags = getReviewModerationTags(review.productId, reviewId)
		tags.forEach((tag) => updateTag(tag))
		updateTag(REVIEWS_CACHE_TAGS.ADMIN_LIST)

		return success("Réponse publiée avec succès", { id: response.id })
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.RESPONSE_CREATE_FAILED)
	}
}
