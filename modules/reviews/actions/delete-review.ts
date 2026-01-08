"use server"

import { updateTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { requireAuth } from "@/modules/auth/lib/require-auth"
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import {
	success,
	notFound,
	forbidden,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import { PRODUCT_LIMITS } from "@/shared/lib/rate-limit-config"
import type { ActionState } from "@/shared/types/server-action"

import { getReviewInvalidationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { deleteReviewSchema } from "../schemas/review.schemas"
import { updateProductReviewStats } from "../services/review-stats.service"

/**
 * Supprime un avis (soft delete pour conformité RGPD)
 *
 * Conditions requises:
 * - Utilisateur connecté
 * - Auteur de l'avis
 */
export async function deleteReview(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification de l'authentification
		const auth = await requireAuth()
		if ("error" in auth) return auth.error

		const userId = auth.user.id

		// 2. Rate limiting
		const rateLimitCheck = await enforceRateLimitForCurrentUser(
			PRODUCT_LIMITS.REVIEW
		)
		if ("error" in rateLimitCheck) return rateLimitCheck.error

		// 3. Extraire et valider les données
		const rawData = {
			id: formData.get("id"),
		}

		const validation = deleteReviewSchema.safeParse(rawData)

		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			const errorPath = firstError?.path.join(".")
			return validationError(
				errorPath ? `${errorPath}: ${firstError.message}` : firstError?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA
			)
		}

		const { id } = validation.data

		// 4. Vérifier que l'avis existe et appartient à l'utilisateur
		const existingReview = await prisma.productReview.findFirst({
			where: {
				id,
				...notDeleted,
			},
			select: {
				id: true,
				userId: true,
				productId: true,
			},
		})

		if (!existingReview) {
			return notFound("Avis")
		}

		if (existingReview.userId !== userId) {
			return forbidden(REVIEW_ERROR_MESSAGES.NOT_OWNER)
		}

		// 5. Soft delete de l'avis dans une transaction
		await prisma.$transaction(async (tx) => {
			// Soft delete l'avis
			await tx.productReview.update({
				where: { id },
				data: { deletedAt: new Date() },
			})

			// Mettre à jour les statistiques du produit (si le produit existe encore)
			if (existingReview.productId) {
				await updateProductReviewStats(tx, existingReview.productId)
			}
		})

		// 6. Invalider le cache
		const tags = getReviewInvalidationTags(existingReview.productId, userId, id)
		tags.forEach((tag) => updateTag(tag))

		return success("Votre avis a été supprimé")
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.DELETE_FAILED)
	}
}
