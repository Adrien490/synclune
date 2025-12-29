"use server"

import { updateTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { requireAdmin } from "@/modules/auth/lib/require-auth"
import {
	success,
	notFound,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"

import { REVIEWS_CACHE_TAGS, getReviewModerationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { updateReviewResponseSchema } from "../schemas/review.schemas"

/**
 * Modifie une reponse admin a un avis
 * Action admin uniquement
 */
export async function updateReviewResponse(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 2. Extraire et valider les donnees
		const rawData = {
			id: formData.get("id"),
			content: formData.get("content"),
		}

		const validation = updateReviewResponseSchema.safeParse(rawData)
		if (!validation.success) {
			return validationError(validation.error.issues[0]?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA)
		}

		const { id, content } = validation.data

		// 3. Récupérer la réponse et l'avis associé
		const response = await prisma.reviewResponse.findFirst({
			where: {
				id,
				...notDeleted,
			},
			select: {
				id: true,
				review: {
					select: {
						id: true,
						productId: true,
					},
				},
			},
		})

		if (!response) {
			return notFound("Réponse")
		}

		// 4. Mettre a jour la reponse
		await prisma.reviewResponse.update({
			where: { id },
			data: { content },
		})

		// 5. Invalider le cache
		const tags = getReviewModerationTags(response.review.productId, response.review.id)
		tags.forEach((tag) => updateTag(tag))
		updateTag(REVIEWS_CACHE_TAGS.ADMIN_LIST)

		return success("Réponse modifiée avec succès")
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.RESPONSE_UPDATE_FAILED)
	}
}
